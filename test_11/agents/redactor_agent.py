import json
import re
import fitz  # PyMuPDF
from typing import List
from gliner import GLiNER

class RedactorAgent:
    def __init__(self, gliner_model=None):
        self.gliner = gliner_model
        self.name_exclusions = {
            'united states', 'new york', 'los angeles', 'san francisco',
            'machine learning', 'data science', 'artificial intelligence',
            'google drive', 'microsoft office', 'adobe acrobat', 'dear sir',
            'dear madam', 'yours truly', 'best regards', 'thank you',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            'i', 'a', 'the'  # Add common single words
        }
    
    def detect_sensitive_info(self, text: str) -> List[dict]:
        all_results = []
        
        if self.gliner is not None:
            try:
                gliner_results = self._detect_with_gliner(text)
                all_results.extend(gliner_results)
            except Exception as e:
                pass
        
        regex_results = self._regex_fallback(text)
        all_results.extend(regex_results)
        
        # Filter to high-priority items and deduplicate
        unique_items = {}
        for item in all_results:
            key = f"{item['type']}_{item['value'].lower()}"
            # Keep high-priority types and more selective name matches
            if item['type'] in ['email', 'phone', 'ssn', 'credit_card', 'password']:
                unique_items[key] = item
            elif item['type'] == 'name' and self._is_strong_name_match(item['value']):
                unique_items[key] = item
        return list(unique_items.values())
    
    def _detect_with_gliner(self, text: str) -> List[dict]:
        labels = ["Person", "Organization", "Date", "Email", "Phone", "Location", "URL", "Money", "Time"]
        
        try:
            text_chunk = text[:5000]
            entities = self.gliner.predict_entities(text_chunk, labels=labels, threshold=0.6)  # Increased back to 0.6
            
            results = []
            for ent in entities:
                entity_type = ent["label"].lower()
                entity_value = ent["text"].strip()
                
                if entity_type == "person" and self._is_strong_name_match(entity_value):
                    results.append({"type": "name", "value": entity_value})
                elif entity_type in ["email", "phone"]:
                    results.append({"type": entity_type, "value": entity_value})
                elif entity_type == "location" and len(entity_value.split()) > 1:
                    results.append({"type": "location", "value": entity_value})
            
            return results
        except Exception:
            return []
    
    def _regex_fallback(self, text: str) -> List[dict]:
        patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b',
            "phone": [
                r'\b\d{3}-\d{3}-\d{4}\b',
                r'\b\(\d{3}\)\s*\d{3}-\d{4}\b'
            ],
            "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
            "credit_card": r'\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b',
            "password": r'\b(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}\b',
            "name": r'\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b'  # Matches "Jon" or "Jon Smith"
        }
        
        found = []
        
        for name, pattern in patterns.items():
            if name == "phone":
                for p in pattern:
                    phones = re.findall(p, text)
                    for phone in phones:
                        digits_only = re.sub(r'\D', '', phone)
                        if len(digits_only) == 10:
                            found.append({"type": "phone", "value": phone})
            else:
                matches = re.findall(pattern, text) if isinstance(pattern, str) else []
                for match in matches:
                    if isinstance(match, tuple):
                        match = ''.join(match)
                    found.append({"type": name, "value": match})
        
        return found
    
    def _is_strong_name_match(self, name: str) -> bool:
        """More selective name validation"""
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
        if len(words) < 1 or len(words) > 3:  # Allow 1-3 words
            return False
        
        if any(len(word) < 3 or len(word) > 20 for word in words):  # Minimum 3 letters
            return False
            
        return True
    
    def redact(self, text: str, sensitive_items: List[dict]) -> str:
        redacted_text = text
        sorted_items = sorted(sensitive_items, key=lambda x: len(x["value"]), reverse=True)
        
        for item in sorted_items:
            original_value = item["value"]
            item_type = item["type"].upper()
            redaction_tag = f"[REDACTED_{item_type}]"
            
            if item["type"] in ["email", "ssn", "credit_card", "password"]:
                pattern = re.escape(original_value)
            elif item["type"] in ["name", "location"]:
                escaped_value = re.escape(original_value)
                pattern = r'\b' + escaped_value + r'\b'
            elif item["type"] == "phone":
                clean_phone = re.sub(r'[\s\-\(\)]', '', original_value)
                if len(clean_phone) == 10:
                    pattern = re.escape(original_value)
                else:
                    continue  
            else:
                pattern = r'\b' + re.escape(original_value) + r'\b'
            
            try:
                redacted_text = re.sub(pattern, redaction_tag, redacted_text, flags=re.IGNORECASE)
            except re.error:
                redacted_text = redacted_text.replace(original_value, redaction_tag)
                
        return redacted_text
    
    def redact_json(self, data: dict, sensitive_items: List[dict]) -> dict:
        redacted_data = json.dumps(data, indent=2)
        redacted_data = self.redact(redacted_data, sensitive_items)
        try:
            return json.loads(redacted_data)
        except json.JSONDecodeError:
            return {"redacted_content": redacted_data}

    def redact_pdf_pymupdf(self, file_path: str, sensitive_items: List[dict], output_path: str):
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
            
                if page_redactions > 0:
                    page.apply_redactions()

            doc.save(output_path)
            doc.close()
            
        except Exception as e:
            try:
                doc.close()
            except:
                pass
            raise e