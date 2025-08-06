import re

class PIIAgent:
    def detect_pii(self, text: str) -> list:
        """Enhanced PII detection with more patterns"""
        patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": r'\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
            "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
            "name": r'\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b'  # Requires at least 3 letters per word
        }
        
        matches = []
        for name, pattern in patterns.items():
            for match in re.findall(pattern, text):
                if isinstance(match, tuple):
                    match = ''.join(match)
                matches.append({"type": name, "value": match})
        
        return matches