from typing import List
import re
import json
import fitz  # PyMuPDF
import gliner

class RedactorAgent:
    def __init__(self):
        # Common non-names to exclude
        self.name_exclusions = {
            'united states', 'new york', 'los angeles', 'san francisco',
            'machine learning', 'data science', 'artificial intelligence',
            'google drive', 'microsoft office', 'adobe acrobat', 'dear sir',
            'dear madam', 'yours truly', 'best regards', 'thank you',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
        }
    
    def detect_sensitive_info(self, text: str) -> List[dict]:
        """Detect sensitive information using GLiNER + regex fallback"""
        all_results = []
        
        # Try GLiNER first
        if gliner is not None:
            try:
                print("🔍 Using GLiNER for entity detection...")
                gliner_results = self._detect_with_gliner(text)
                all_results.extend(gliner_results)
                print(f"🤖 GLiNER found {len(gliner_results)} entities")
            except Exception as e:
                print(f"❌ GLiNER detection failed: {e}")
        
        # Always run regex fallback for additional coverage
        regex_results = self._regex_fallback(text)
        all_results.extend(regex_results)
        print(f"🔍 Regex found {len(regex_results)} additional items")
        
        # Deduplicate results
        unique_items = {}
        for item in all_results:
            key = f"{item['type']}_{item['value'].lower()}"
            unique_items[key] = item
        
        final_results = list(unique_items.values())
        print(f"📊 Total unique items found: {len(final_results)}")
        
        return final_results
    
    def _detect_with_gliner(self, text: str) -> List[dict]:
        """Use GLiNER for Named Entity Recognition"""
        labels = ["Person", "Organization", "Date", "Email", "Phone", "Location", "URL", "Money", "Time"]
        
        try:
            # Limit text length for processing
            text_chunk = text[:5000]  # Process first 5000 characters
            entities = gliner.predict_entities(text_chunk, labels=labels, threshold=0.4)
            
            results = []
            for ent in entities:
                entity_type = ent["label"].lower()
                entity_value = ent["text"].strip()
                
                # Map GLiNER labels to our standard types
                if entity_type == "person":
                    if self._is_likely_person_name(entity_value):
                        results.append({"type": "name", "value": entity_value})
                elif entity_type == "organization":
                    results.append({"type": "organization", "value": entity_value})
                elif entity_type in ["email", "phone", "url"]:
                    results.append({"type": entity_type, "value": entity_value})
                elif entity_type == "location":
                    results.append({"type": "location", "value": entity_value})
                elif entity_type in ["date", "time"]:
                    results.append({"type": "date", "value": entity_value})
                elif entity_type == "money":
                    results.append({"type": "financial", "value": entity_value})
            
            return results
            
        except Exception as e:
            print(f"❌ GLiNER processing error: {e}")
            return []
    
    def _regex_fallback(self, text: str) -> List[dict]:
        """Enhanced regex patterns for additional coverage"""
        patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": [
                r'\b\d{3}-\d{3}-\d{4}\b',  # 123-456-7890
                r'\b\(\d{3}\)\s*\d{3}-\d{4}\b',  # (123) 456-7890
                r'\b\d{10}\b',  # 1234567890
                r'\b\d{3}\.\d{3}\.\d{4}\b',  # 123.456.7890
                r'\+\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b'  # International
            ],
            "url": r'https?://[^\s<>"{}|\\^`\[\]]+',
            "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
            "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
            "ip_address": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
        }
        
        found = []
        
        # Email detection
        emails = re.findall(patterns["email"], text, re.IGNORECASE)
        for email in emails:
            found.append({"type": "email", "value": email})
        
        # Phone detection
        for pattern in patterns["phone"]:
            phones = re.findall(pattern, text)
            for phone in phones:
                # Validate phone number
                digits_only = re.sub(r'\D', '', phone)
                if len(digits_only) >= 10:
                    found.append({"type": "phone", "value": phone})
        
        # URL detection
        urls = re.findall(patterns["url"], text)
        for url in urls:
            found.append({"type": "url", "value": url})
        
        # SSN detection
        ssns = re.findall(patterns["ssn"], text)
        for ssn in ssns:
            found.append({"type": "ssn", "value": ssn})
        
        # Credit card detection
        cards = re.findall(patterns["credit_card"], text)
        for card in cards:
            digits_only = re.sub(r'\D', '', card)
            if len(digits_only) == 16:
                found.append({"type": "credit_card", "value": card})
        
        # IP address detection
        ips = re.findall(patterns["ip_address"], text)
        for ip in ips:
            octets = ip.split('.')
            if all(0 <= int(octet) <= 255 for octet in octets):
                found.append({"type": "ip_address", "value": ip})
        
        return found
    
    def _is_likely_person_name(self, name: str) -> bool:
        """Enhanced name validation"""
        name_lower = name.lower()
        if name_lower in self.name_exclusions:
            return False
        
        non_name_patterns = [
            r'\b(mr|mrs|ms|dr|prof|sir|madam)\b',
            r'\b(inc|llc|corp|ltd|co)\b',
            r'\b(street|avenue|road|drive|lane)\b',
            r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\b'
        ]
        
        for pattern in non_name_patterns:
            if re.search(pattern, name_lower):
                return False
        
        words = name.split()
        if len(words) < 2 or len(words) > 4:
            return False
        
        if any(len(word) < 2 or len(word) > 20 for word in words):
            return False
            
        return True
    
    def redact(self, text: str, sensitive_items: List[dict]) -> str:
        """FIXED: Precise redaction that only replaces the sensitive data"""
        redacted_text = text
        sorted_items = sorted(sensitive_items, key=lambda x: len(x["value"]), reverse=True)
        
        for item in sorted_items:
            original_value = item["value"]
            item_type = item["type"].upper()
            redaction_tag = f"[REDACTED_{item_type}]"
            if item["type"] in ["email", "url", "ssn", "credit_card", "ip_address"]:
                pattern = re.escape(original_value)
            elif item["type"] in ["name", "person", "organization", "location"]:
                escaped_value = re.escape(original_value)
                pattern = r'\b' + escaped_value + r'\b'
            elif item["type"] == "phone":
                clean_phone = re.sub(r'[\s\-\(\)]', '', original_value)
                if len(clean_phone) >= 10:
                    pattern = re.escape(original_value)
                else:
                    continue  
            else:
                pattern = r'\b' + re.escape(original_value) + r'\b'
            try:
                old_text = redacted_text
                redacted_text = re.sub(pattern, redaction_tag, redacted_text, flags=re.IGNORECASE)
                if old_text != redacted_text:
                    print(f"🔄 Redacted: '{original_value}' -> {redaction_tag}")
                else:
                    print(f"⚠️ Could not redact: '{original_value}' (pattern not found)")
                    
            except re.error as e:
                print(f"❌ Regex error for '{original_value}': {e}")
                redacted_text = redacted_text.replace(original_value, redaction_tag)
        return redacted_text
    
    def redact_json(self, data: dict, sensitive_items: List[dict]) -> dict:
        """Enhanced JSON redaction"""
        redacted_data = json.dumps(data, indent=2)
        redacted_data = self.redact(redacted_data, sensitive_items)
        try:
            return json.loads(redacted_data)
        except json.JSONDecodeError:
            return {"redacted_content": redacted_data}

    def redact_pdf_pymupdf(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Enhanced PDF redaction with better text matching"""
        try:
            doc = fitz.open(file_path)
            total_redactions = 0
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_redactions = 0
                for item in sensitive_items:
                    text_instances = page.search_for(item["value"])
                    
                    for inst in text_instances:
                        page.add_redact_annot(inst, fill=(0, 0, 0))
                        page_redactions += 1
                        total_redactions += 1
                        print(f"🔄 PDF: Redacted '{item['value'][:20]}...' on page {page_num + 1}")
            
                if page_redactions > 0:
                    page.apply_redactions()
                    print(f"✅ Applied {page_redactions} redactions on page {page_num + 1}")
            

            doc.save(output_path)
            doc.close()
            
            print(f"📄 PDF successfully redacted with {total_redactions} total redactions")
            print(f"📄 Saved to: {output_path}")
            
        except Exception as e:
            print(f"❌ Error redacting PDF: {e}")

            try:
                doc.close()
            except:
                pass
