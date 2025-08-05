import unittest
from app.agents.runner_agent import RunnerAgent
from app.agents.redactor_agent import RedactorAgent
from app.agents.pii_agent import PIIAgent
from app.agents.compliance_agent import ComplianceAgent
from app.agents.audit_agent import AuditAgent

class TestAgents(unittest.TestCase):

    def setUp(self):
        self.runner_agent = RunnerAgent()
        self.redactor_agent = RedactorAgent()
        self.pii_agent = PIIAgent()
        self.compliance_agent = ComplianceAgent()
        self.audit_agent = AuditAgent()

    def test_load_text_pdf(self):
        text = self.runner_agent.load_text('tests/sample.pdf')
        self.assertIsInstance(text, str)

    def test_load_text_txt(self):
        text = self.runner_agent.load_text('tests/sample.txt')
        self.assertIsInstance(text, str)

    def test_detect_sensitive_info(self):
        sample_text = "Contact me at john.doe@example.com or 123-456-7890."
        sensitive_items = self.redactor_agent.detect_sensitive_info(sample_text)
        self.assertGreater(len(sensitive_items), 0)

    def test_redact_text(self):
        sample_text = "My email is john.doe@example.com and my phone number is 123-456-7890."
        sensitive_items = self.redactor_agent.detect_sensitive_info(sample_text)
        redacted_text = self.redactor_agent.redact(sample_text, sensitive_items)
        self.assertIn("[REDACTED_EMAIL]", redacted_text)
        self.assertIn("[REDACTED_PHONE]", redacted_text)

    def test_detect_pii(self):
        sample_text = "My SSN is 123-45-6789."
        pii_items = self.pii_agent.detect_pii(sample_text)
        self.assertGreater(len(pii_items), 0)

    def test_apply_compliance_policy(self):
        pii_items = [{"type": "email", "value": "john.doe@example.com"}]
        redactions = self.compliance_agent.apply_policy(pii_items, "GDPR")
        self.assertIn("john.doe@example.com", redactions)

    def test_log_metadata(self):
        metadata = self.audit_agent.log_metadata("original text", "redacted text", [], "feedback", "file_path")
        self.assertIsInstance(metadata, str)

if __name__ == '__main__':
    unittest.main()