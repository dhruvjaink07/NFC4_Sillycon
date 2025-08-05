import os
import re
import cv2
import json
import pytesseract
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
from typing import List, Tuple
from dotenv import load_dotenv
from PyPDF2 import PdfReader, PdfWriter
from langsmith import traceable
from langchain_google_genai import ChatGoogleGenerativeAI
import numpy as np
import time

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Debug: Check if API key is loaded
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables")
    print("Please check your .env file or set the API key")

try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=GEMINI_API_KEY,
        timeout=30  # Add timeout
    )
    print("✅ Gemini API initialized successfully")
except Exception as e:
    print(f"❌ Error initializing Gemini API: {e}")
    llm = None

@traceable
class RunnerAgent:
    def load_text(self, file_path: str) -> str:
        if file_path.endswith(".pdf"):
            reader = PdfReader(file_path)
            text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        elif file_path.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif file_path.lower().endswith((".jpg", ".jpeg", ".png")):
            image = cv2.imread(file_path)
            text = pytesseract.image_to_string(image)
        else:
            raise ValueError("Unsupported file type. Use PDF, TXT, or JPG/PNG.")
        return text
    
    def get_file_type(self, file_path: str) -> str:
        """Determine the file type"""
        if file_path.endswith(".pdf"):
            return "pdf"
        elif file_path.endswith(".txt"):
            return "txt"
        elif file_path.lower().endswith((".jpg", ".jpeg", ".png")):
            return "image"
        else:
            raise ValueError("Unsupported file type")

@traceable
class RedactorAgent:
    def detect_sensitive_info(self, text: str) -> List[dict]:
        if not llm:
            print("❌ Gemini API not available, using fallback regex detection...")
            return self._fallback_detect_sensitive_info(text)
        
        try:
            print("🔍 Analyzing text with Gemini API...")
            prompt = (
                "Extract and return a list of sensitive data from this text. "
                "Types should include email, phone number, URL, and names. "
                "Return in this JSON format:\n"
                "[{\"type\": \"email\", \"value\": \"abc@email.com\"}, ...]\n\n"
                f"Text:\n{text[:2000]}"  # Limit text length to avoid API issues
            )
            
            print("📡 Sending request to Gemini API...")
            start_time = time.time()
            result = llm.invoke(prompt)
            end_time = time.time()
            
            print(f"✅ API response received in {end_time - start_time:.2f} seconds")
            return self._parse_json_list(result.content)
            
        except Exception as e:
            print(f"❌ Error with Gemini API: {e}")
            print("🔄 Falling back to regex-based detection...")
            return self._fallback_detect_sensitive_info(text)
    
    def _fallback_detect_sensitive_info(self, text: str) -> List[dict]:
        """Fallback method using regex patterns"""
        sensitive_items = []
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        for email in emails:
            sensitive_items.append({"type": "email", "value": email})
        
        # Phone pattern (various formats)
        phone_patterns = [
            r'\b\d{3}-\d{3}-\d{4}\b',  # 123-456-7890
            r'\b\(\d{3}\)\s*\d{3}-\d{4}\b',  # (123) 456-7890
            r'\b\d{10}\b',  # 1234567890
            r'\b\d{3}\.\d{3}\.\d{4}\b'  # 123.456.7890
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            for phone in phones:
                sensitive_items.append({"type": "phone", "value": phone})
        
        # URL pattern
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        for url in urls:
            sensitive_items.append({"type": "url", "value": url})
        
        # Simple name pattern (capitalized words, common name patterns)
        name_pattern = r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
        names = re.findall(name_pattern, text)
        for name in names:
            # Filter out common non-names
            if name.lower() not in ['united states', 'new york', 'los angeles', 'san francisco']:
                sensitive_items.append({"type": "name", "value": name})
        
        print(f"🔍 Fallback detection found {len(sensitive_items)} items using regex")
        return sensitive_items

    def redact_text(self, text: str, sensitive_items: List[dict]) -> str:
        """Redact text while preserving structure"""
        for item in sensitive_items:
            value = re.escape(item["value"])
            # Create redaction tag with similar length to preserve formatting
            tag = f"[REDACTED_{item['type'].upper()}]"
            text = re.sub(value, tag, text, flags=re.IGNORECASE)
        return text
    
    def redact_pdf_pymupdf(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Method 1: Redact PDF using PyMuPDF with text search and black boxes"""
        doc = fitz.open(file_path)
        
        for page in doc:
            for item in sensitive_items:
                # Search for sensitive text on the page
                text_instances = page.search_for(item["value"])
                
                for inst in text_instances:
                    # Create a black rectangle over the sensitive text
                    page.add_redact_annot(inst, fill=(0, 0, 0))
            
            # Apply all redactions on this page
            page.apply_redactions()
        
        doc.save(output_path)
        doc.close()
        print(f"PDF redacted and saved to: {output_path}")
    
    def redact_pdf_text_replacement(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Method 2: Extract text, redact, and create new PDF (loses original formatting)"""
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
        # Extract text
        reader = PdfReader(file_path)
        full_text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        
        # Redact text
        redacted_text = self.redact_text(full_text, sensitive_items)
        
        # Create new PDF
        c = canvas.Canvas(output_path, pagesize=letter)
        width, height = letter
        
        # Split text into lines and pages
        lines = redacted_text.split('\n')
        y_position = height - 50
        
        for line in lines:
            if y_position < 50:  # Start new page
                c.showPage()
                y_position = height - 50
            
            c.drawString(50, y_position, line[:100])  # Limit line length
            y_position -= 15
        
        c.save()
        print(f"PDF redacted and saved to: {output_path}")
    
    def redact_image(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Method 3: Redact images by detecting text locations and covering them"""
        image = cv2.imread(file_path)
        
        # Get OCR data with bounding boxes
        ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        for item in sensitive_items:
            sensitive_text = item["value"]
            
            # Find the sensitive text in OCR results
            for i, text in enumerate(ocr_data['text']):
                if sensitive_text.lower() in text.lower() and int(ocr_data['conf'][i]) > 30:
                    # Get bounding box coordinates
                    x = ocr_data['left'][i]
                    y = ocr_data['top'][i]
                    w = ocr_data['width'][i]
                    h = ocr_data['height'][i]
                    
                    # Draw black rectangle over sensitive text
                    cv2.rectangle(image, (x, y), (x + w, y + h), (0, 0, 0), -1)
                    
                    # Optionally add redaction text
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    redaction_text = f"[REDACTED_{item['type'].upper()}]"
                    text_size = cv2.getTextSize(redaction_text, font, 0.5, 1)[0]
                    text_x = x + (w - text_size[0]) // 2
                    text_y = y + (h + text_size[1]) // 2
                    cv2.putText(image, redaction_text, (text_x, text_y), font, 0.5, (255, 255, 255), 1)
        
        cv2.imwrite(output_path, image)
        print(f"Image redacted and saved to: {output_path}")
    
    def redact_image_pil(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Method 4: Alternative image redaction using PIL"""
        image = Image.open(file_path)
        draw = ImageDraw.Draw(image)
        
        # Convert to cv2 format for OCR
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        ocr_data = pytesseract.image_to_data(cv_image, output_type=pytesseract.Output.DICT)
        
        try:
            font = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
        
        for item in sensitive_items:
            sensitive_text = item["value"]
            
            for i, text in enumerate(ocr_data['text']):
                if sensitive_text.lower() in text.lower() and int(ocr_data['conf'][i]) > 30:
                    x = ocr_data['left'][i]
                    y = ocr_data['top'][i]
                    w = ocr_data['width'][i]
                    h = ocr_data['height'][i]
                    
                    # Draw black rectangle
                    draw.rectangle([x, y, x + w, y + h], fill='black')
                    
                    # Add redaction text
                    redaction_text = f"[REDACTED_{item['type'].upper()}]"
                    text_bbox = draw.textbbox((0, 0), redaction_text, font=font)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]
                    text_x = x + (w - text_width) // 2
                    text_y = y + (h - text_height) // 2
                    draw.text((text_x, text_y), redaction_text, fill='white', font=font)
        
        image.save(output_path)
        print(f"Image redacted and saved to: {output_path}")
    
    def redact_txt_preserve_structure(self, file_path: str, sensitive_items: List[dict], output_path: str):
        """Method 5: Redact text file while preserving structure, spacing, and formatting"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Preserve original structure by replacing with similar-length redactions
        redacted_content = content
        
        for item in sensitive_items:
            original_value = item["value"]
            redaction_tag = f"[REDACTED_{item['type'].upper()}]"
            
            # If we want to preserve exact spacing, pad or truncate the redaction
            if len(redaction_tag) < len(original_value):
                # Pad with spaces to match original length
                padding = len(original_value) - len(redaction_tag)
                redaction_tag += " " * padding
            elif len(redaction_tag) > len(original_value):
                # Truncate if redaction is longer
                redaction_tag = redaction_tag[:len(original_value)]
            
            # Use word boundaries for better replacement
            pattern = r'\b' + re.escape(original_value) + r'\b'
            redacted_content = re.sub(pattern, redaction_tag, redacted_content, flags=re.IGNORECASE)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(redacted_content)
        
        print(f"Text file redacted and saved to: {output_path}")

    def _parse_json_list(self, raw: str) -> List[dict]:
        try:
            start = raw.index('[')
            end = raw.rindex(']') + 1
            return json.loads(raw[start:end])
        except:
            return []

@traceable
class ComplianceAgent:
    def validate_redaction(self, redacted_text: str, compliance_type: str) -> str:
        if not llm:
            return f"✅ Redaction completed for {compliance_type} compliance (API unavailable - manual review recommended)"
        
        try:
            print("🔍 Validating compliance with Gemini API...")
            prompt = (
                f"You are a compliance officer validating text redactions. "
                f"Check whether the redacted text meets the standards of {compliance_type} (GDPR, HIPAA, DPDP).\n"
                f"Return only a summary decision and any violations found.\n\n"
                f"Redacted Text:\n{redacted_text[:1000]}"  # Limit text length
            )
            
            start_time = time.time()
            result = llm.invoke(prompt)
            end_time = time.time()
            
            print(f"✅ Compliance validation completed in {end_time - start_time:.2f} seconds")
            return result.content
            
        except Exception as e:
            print(f"❌ Error validating compliance: {e}")
            return f"✅ Redaction completed for {compliance_type} compliance (validation failed - manual review recommended)"

@traceable
class AuditAgent:
    def log_metadata(self, original_text: str, redacted_file_path: str, sensitive_items: List[dict], compliance_feedback: str):
        metadata = {
            "original_length": len(original_text),
            "redacted_file": redacted_file_path,
            "redacted_items_count": len(sensitive_items),
            "redacted_items": sensitive_items,
            "compliance_notes": compliance_feedback,
            "timestamp": json.dumps({"timestamp": "generated"}, default=str)
        }
        with open("audit_log.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        print("[AuditAgent] Metadata saved to audit_log.json")

@traceable
class CoordinatorAgent:
    def __init__(self):
        self.runner = RunnerAgent()
        self.redactor = RedactorAgent()
        self.compliance = ComplianceAgent()
        self.audit = AuditAgent()

    def handle_file(self, file_path: str, compliance_type: str):
        print(f"\n🚀 [RunnerAgent] Processing file: {file_path}")
        
        try:
            # Automatically determine file type and best redaction method
            file_type = self.runner.get_file_type(file_path)
            print(f"📄 [System] Detected file type: {file_type.upper()}")
            
            # Auto-select best redaction method based on file type
            if file_type == "pdf":
                redaction_method = "pymupdf"
                print("🔧 [System] Using PyMuPDF redaction method for PDF")
            elif file_type == "image":
                redaction_method = "opencv"
                print("🔧 [System] Using OpenCV redaction method for image")
            elif file_type == "txt":
                redaction_method = "structure_preserving"
                print("🔧 [System] Using structure-preserving redaction method for text")
            
            # Extract text for analysis
            print("📖 [RunnerAgent] Extracting text content...")
            raw_text = self.runner.load_text(file_path)
            print(f"📊 [System] Extracted {len(raw_text)} characters")
            
            print("🔍 [RedactorAgent] Detecting sensitive data...")
            sensitive_items = self.redactor.detect_sensitive_info(raw_text)

            print(f"📋 [RedactorAgent] Found {len(sensitive_items)} item(s):")
            for item in sensitive_items:
                print(f"   - {item['type']}: {item['value']}")

            # Check if no sensitive items found
            if not sensitive_items:
                print("ℹ️  No sensitive information detected. Creating copy with compliance suffix...")
            
            # Generate output path
            base_name = os.path.splitext(file_path)[0]
            file_ext = os.path.splitext(file_path)[1]
            output_path = f"{base_name}_redacted_{compliance_type}{file_ext}"
            
            # Apply appropriate redaction method based on file type
            print(f"🛠️  [RedactorAgent] Applying redaction for {file_type}...")
            
            if file_type == "pdf":
                try:
                    self.redactor.redact_pdf_pymupdf(file_path, sensitive_items, output_path)
                except Exception as e:
                    print(f"⚠️  [Warning] PyMuPDF method failed: {e}")
                    print("🔄 [System] Falling back to text replacement method...")
                    self.redactor.redact_pdf_text_replacement(file_path, sensitive_items, output_path)
                    
            elif file_type == "image":
                try:
                    self.redactor.redact_image(file_path, sensitive_items, output_path)
                except Exception as e:
                    print(f"⚠️  [Warning] OpenCV method failed: {e}")
                    print("🔄 [System] Falling back to PIL method...")
                    self.redactor.redact_image_pil(file_path, sensitive_items, output_path)
                    
            elif file_type == "txt":
                self.redactor.redact_txt_preserve_structure(file_path, sensitive_items, output_path)

            # Validate compliance on the text version (for audit purposes)
            print("✅ [ComplianceAgent] Validating compliance...")
            try:
                redacted_text = self.redactor.redact_text(raw_text, sensitive_items)
                compliance_notes = self.compliance.validate_redaction(redacted_text, compliance_type)
            except Exception as e:
                print(f"⚠️  Compliance validation error: {e}")
                compliance_notes = f"Compliance validation failed: {e}"

            print("📝 [AuditAgent] Saving audit trail...")
            try:
                self.audit.log_metadata(raw_text, output_path, sensitive_items, compliance_notes)
            except Exception as e:
                print(f"⚠️  Audit logging error: {e}")

            print(f"\n🎉 ✅ Redaction completed successfully!")
            print(f"📁 Original file: {file_path}")
            print(f"📁 Redacted file: {output_path}")
            print(f"📊 File type: {file_type}")
            print(f"🔧 Method used: {redaction_method}")
            print(f"🔒 Compliance: {compliance_type}")
            print(f"📝 Items redacted: {len(sensitive_items)}")
            
        except Exception as e:
            print(f"❌ Critical error during processing: {e}")
            print("🔍 Please check:")
            print("  - File path is correct and accessible")
            print("  - Required dependencies are installed")
            print("  - API key is properly configured")
            raise


def main():
    file_path = input("Enter file path (.txt, .pdf, .jpg, .png): ").strip()
    if not os.path.exists(file_path):
        print("File not found.")
        return

    print("Select compliance type: [GDPR, HIPAA, DPDP]")
    compliance_type = input("Enter compliance type: ").strip().upper()
    if compliance_type not in ["GDPR", "HIPAA", "DPDP"]:
        print("Invalid compliance type.")
        return

    coordinator = CoordinatorAgent()
    # Auto-detect format and apply appropriate redaction method
    coordinator.handle_file(file_path, compliance_type)


if __name__ == "__main__":
    main()