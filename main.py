import os
import json
import docx
from PyPDF2 import PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from docx import Document
import re
from typing import List
import fitz  # PyMuPDF
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import time
from gliner import GLiNER

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

try:
    gliner = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
    print("✅ GLiNER NER model loaded")
except Exception as e:
    print(f"❌ Failed to load GLiNER model: {e}")
    gliner = None

try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=GEMINI_API_KEY,
        timeout=30
    )
    print("✅ LLM loaded for compliance validation")
except Exception as e:
    print(f"❌ Failed to load Gemini LLM: {e}")
    llm = None


class RunnerAgent:
    def load_text(self, file_path: str) -> str:
        if file_path.endswith(".pdf"):
            reader = PdfReader(file_path)
            text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())

        elif file_path.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

        elif file_path.endswith(".json"):
            with open(file_path, "r", encoding="utf-8") as f:
                self.json_data = json.load(f)
                text = json.dumps(self.json_data, indent=2)

        elif file_path.endswith(".docx"):
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])

        else:
            raise ValueError("Unsupported file type. Use PDF, TXT, JSON, or DOCX.")

        return text

    def get_file_type(self, file_path: str) -> str:
        if file_path.endswith(".pdf"):
            return "pdf"
        elif file_path.endswith(".txt"):
            return "txt"
        elif file_path.endswith(".json"):
            return "json"
        elif file_path.endswith(".docx"):
            return "docx"
        else:
            raise ValueError("Unsupported file type")

    def save_redacted_text(self, redacted_text: str, original_path: str, output_path: str):
        file_type = self.get_file_type(original_path)

        if file_type == "txt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(redacted_text)

        elif file_type == "json":
            try:
                redacted_json = json.loads(redacted_text)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(redacted_json, f, indent=2)
            except json.JSONDecodeError:
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(redacted_text)

        elif file_type == "docx":
            doc = Document()
            for paragraph in redacted_text.split("\n"):
                doc.add_paragraph(paragraph)
            doc.save(output_path)

        elif file_type == "pdf":
            c = canvas.Canvas(output_path, pagesize=letter)
            lines = redacted_text.split("\n")
            width, height = letter
            y = height - 40
            for line in lines:
                if y < 40:
                    c.showPage()
                    y = height - 40
                c.drawString(40, y, line[:100])  # Limit line length
                y -= 15
            c.save()

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

class PIIAgent:
    def detect_pii(self, text: str) -> list:
        """Enhanced PII detection with more patterns"""
        patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": r'\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
            "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
        }
        matches = []
        for name, pattern in patterns.items():
            for match in re.findall(pattern, text):
                if isinstance(match, tuple):
                    match = ''.join(match)
                matches.append({"type": name, "value": match})
        return matches

class ComplianceAgent:
    def apply_policy(self, pii_items: list, compliance_type: str) -> list:
        """Enhanced compliance policy application"""
        redactions = []
        for item in pii_items:
            if compliance_type == "GDPR":
                redactions.append(item["value"])
            elif compliance_type == "HIPAA":
                if item["type"] in ["ssn", "phone", "name", "email"]:
                    redactions.append(item["value"])
            elif compliance_type == "DPDP":
                if item["type"] != "url":  
                    redactions.append(item["value"])
        return redactions

    def validate_redaction(self, redacted_text: str, compliance_type: str) -> str:
        """Enhanced compliance validation"""
        if llm is None:
            return f"Compliance validation skipped - LLM not available. Processed with {compliance_type} standards."
        try:
            prompt = (
                f"You are a compliance officer validating text redactions for {compliance_type}. "
                f"Analyze the redacted text and check for:\n"
                f"1. Any remaining personal identifiable information\n"
                f"2. Compliance with {compliance_type} standards\n"
                f"3. Proper redaction formatting\n\n"
                f"Return a brief assessment (2-3 sentences) of compliance status.\n\n"
                f"Redacted Text:\n{redacted_text[:1000]}"  # Limit for API
            )
            result = llm.invoke(prompt)
            return result.content if hasattr(result, 'content') else str(result)
            
        except Exception as e:
            return f"Compliance validation completed with basic standards. Error: {str(e)}"
        
class AuditAgent:
    def log_metadata(self, original_text: str, redacted_text: str, sensitive_items: List[dict], compliance_feedback: str, file_path: str):
        """Enhanced audit logging with more details"""
        item_counts = {}
        for item in sensitive_items:
            item_type = item['type']
            item_counts[item_type] = item_counts.get(item_type, 0) + 1
        
        metadata = {
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_path": file_path,
            "file_size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            "original_length": len(original_text),
            "redacted_length": len(redacted_text),
            "total_redacted_items": len(sensitive_items),
            "redacted_items_by_type": item_counts,
            "redacted_items": [
                {"type": item["type"], "value_length": len(item["value"])} 
                for item in sensitive_items
            ],
            "compliance_notes": str(compliance_feedback),
            "processing_status": "completed"
        }

        os.makedirs("audit_logs", exist_ok=True)
        
        log_file = f"audit_logs/audit_log_{os.path.basename(file_path)}_{int(time.time())}.json"
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        print(f"📋 [AuditAgent] Detailed metadata saved to {log_file}")

class CoordinatorAgent:
    def __init__(self):
        self.runner = RunnerAgent()
        self.redactor = RedactorAgent()
        self.compliance = ComplianceAgent()
        self.audit = AuditAgent()
    def handle_files(self, file_paths: List[str], compliance_type: str):
        """Enhanced file processing with better error handling"""
        for file_path in file_paths:
            print(f"\n🔄 Processing: {file_path}")
        
            if not os.path.exists(file_path):
                print(f"❌ File not found: {file_path}")
                continue
            
            try:
                original_text = self.runner.load_text(file_path)
                print(f"📄 Loaded {len(original_text)} characters")
                pii_items = self.redactor.detect_sensitive_info(original_text)
                if not pii_items:
                    print("✅ No sensitive information detected")
                    continue
                
                print(f"🔍 Found {len(pii_items)} sensitive items:")
                for item in pii_items:
                    print(f"   - {item['type']}: {item['value'][:30]}{'...' if len(item['value']) > 30 else ''}")
            
                redacted_text = self.redactor.redact(original_text, pii_items)
                file_ext = os.path.splitext(file_path)[1]
                output_path = file_path.replace(file_ext, f"_redacted{file_ext}")
                if file_ext == ".pdf":
                    self.redactor.redact_pdf_pymupdf(file_path, pii_items, output_path)
                else:
                    self.runner.save_redacted_text(redacted_text, file_path, output_path)

                print(f"✅ Redacted file saved at: {output_path}")
                feedback = self.compliance.validate_redaction(redacted_text, compliance_type)
                print(f"📋 Compliance feedback: {feedback[:100]}...")
                self.audit.log_metadata(original_text, redacted_text, pii_items, feedback, file_path)
                
            except Exception as e:
                print(f"❌ Error processing {file_path}: {str(e)}")
                import traceback
                print(f"Full error details: {traceback.format_exc()}")
                continue
if __name__ == "__main__":
    print("🚀 Multi-Agent Sensitive Data Redaction System with GLiNER")
    print("=" * 60)
    print(f"GLiNER Status: {'✅ Loaded' if gliner else '❌ Not Available'}")
    print(f"LLM Status: {'✅ Loaded' if llm else '❌ Not Available'}")
    print()
    test_mode = input("Do you want to test with sample data first? (y/n): ").strip().lower()
    
    if test_mode == 'y':
        print("\n🧪 Testing with sample data...")
        sample_text = "Dear Mr. Thompson, please contact John Smith at john.smith@email.com or call 555-123-4567. Our office is located in New York."
        redactor = RedactorAgent()
        items = redactor.detect_sensitive_info(sample_text)
        redacted = redactor.redact(sample_text, items)
        print(f"Original: {sample_text}")
        print(f"Redacted: {redacted}")
        print(f"Items found: {len(items)}")
        for item in items:
            print(f"  - {item['type']}: {item['value']}")
        print()
    while True:
        file_paths_input = input("Enter file paths (comma-separated for multiple files, or single file): ").strip()
        if not file_paths_input:
            print("❌ Please provide at least one file path")
            continue    
        file_paths = [path.strip() for path in file_paths_input.split(",")]
        invalid_files = [path for path in file_paths if not os.path.exists(path)]    
        if invalid_files:
            print(f"❌ Files not found: {', '.join(invalid_files)}")
            continue

        print("\nSelect compliance type:")
        print("1. GDPR (General Data Protection Regulation)")
        print("2. HIPAA (Health Insurance Portability and Accountability Act)")
        print("3. DPDP (Digital Personal Data Protection Act)")   
        compliance_choice = input("Enter choice (1/2/3) or type name directly: ").strip()

        if compliance_choice == "1":
            compliance_type = "GDPR"
        elif compliance_choice == "2":
            compliance_type = "HIPAA"
        elif compliance_choice == "3":
            compliance_type = "DPDP"
        elif compliance_choice.upper() in ["GDPR", "HIPAA", "DPDP"]:
            compliance_type = compliance_choice.upper()
        else:
            print("❌ Invalid compliance type.")
            continue

        print(f"\n🔄 Processing with {compliance_type} compliance...")
        coordinator = CoordinatorAgent()
        coordinator.handle_files(file_paths, compliance_type)
        more = input("\nDo you want to process more files? (y/n): ").strip().lower()
        if more != "y":
            print("👋 Thank you for using the redaction system!")
            break
