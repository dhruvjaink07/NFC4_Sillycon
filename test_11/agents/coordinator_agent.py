import os
from typing import List, Dict
from .runner_agent import RunnerAgent
from .redactor_agent import RedactorAgent
from .compliance_agent import ComplianceAgent
from .audit_agent import AuditAgent


class CoordinatorAgent:
    def __init__(self, gliner_model=None, llm=None):
        self.runner = RunnerAgent()
        self.redactor = RedactorAgent(gliner_model)
        self.compliance = ComplianceAgent(llm)
        self.audit = AuditAgent()

    def process_single_file(self, file_path: str, compliance_type: str) -> Dict:
        """Process a single file and return results"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            # Load and process file
            original_text = self.runner.load_text(file_path)
            pii_items = self.redactor.detect_sensitive_info(original_text)
            
            if not pii_items:
                return {
                    "status": "success",
                    "message": "No sensitive information detected",
                    "redacted_file": None,
                    "audit_log": None
                }
            
            # Redact sensitive information
            redacted_text = self.redactor.redact(original_text, pii_items)
            
            # Generate output paths
            file_ext = os.path.splitext(file_path)[1]
            output_path = file_path.replace(file_ext, f"_redacted{file_ext}")
            
            # Save redacted file
            if file_ext == ".pdf":
                self.redactor.redact_pdf_pymupdf(file_path, pii_items, output_path)
            else:
                self.runner.save_redacted_text(redacted_text, file_path, output_path)

            # Validate compliance and create audit log
            feedback = self.compliance.validate_redaction(redacted_text, compliance_type)
            audit_log_path = output_path.replace(file_ext, "_audit.json")
            self.audit.log_metadata(original_text, redacted_text, pii_items, feedback, file_path, audit_log_path)
            
            return {
                "status": "success",
                "message": f"File processed successfully with {len(pii_items)} redactions",
                "redacted_file": output_path,
                "audit_log": audit_log_path,
                "redacted_items_count": len(pii_items)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error processing file: {str(e)}",
                "redacted_file": None,
                "audit_log": None
            }

    def process_multiple_files(self, file_paths: List[str], compliance_type: str) -> List[Dict]:
        """Process multiple files and return results"""
        results = []
        
        for file_path in file_paths:
            result = self.process_single_file(file_path, compliance_type)
            result["file_path"] = file_path
            results.append(result)
        
        return results