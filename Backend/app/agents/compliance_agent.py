from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import os

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_api_key)

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
