from typing import List
import time
import os
import json

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
        return log_file
