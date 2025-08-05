import os
import tempfile
import uuid
import zipfile
import io
from flask import Blueprint, request, send_file, jsonify
from werkzeug.utils import secure_filename
from app.agents.runner_agent import RunnerAgent
from app.agents.redactor_agent import RedactorAgent
from app.agents.compliance_agent import ComplianceAgent
from app.agents.audit_agent import AuditAgent

bp = Blueprint('redact', __name__)

class CoordinatorAgent:
    def __init__(self):
        self.runner = RunnerAgent()
        self.redactor = RedactorAgent()
        self.compliance = ComplianceAgent()
        self.audit = AuditAgent()

    def handle_file(self, file_path, compliance_type, temp_dir):
        original_text = self.runner.load_text(file_path)
        pii_items = self.redactor.detect_sensitive_info(original_text)
        if not pii_items:
            return None, None
        redacted_text = self.redactor.redact(original_text, pii_items)
        file_ext = os.path.splitext(file_path)[1]
        output_path = os.path.join(temp_dir, f"{uuid.uuid4()}_redacted{file_ext}")
        if file_ext == ".pdf":
            self.redactor.redact_pdf_pymupdf(file_path, pii_items, output_path)
        else:
            self.runner.save_redacted_text(redacted_text, file_path, output_path)
        feedback = self.compliance.validate_redaction(redacted_text, compliance_type)
        audit_path = self.audit.log_metadata(original_text, redacted_text, pii_items, feedback, file_path)
        return output_path, audit_path

@bp.route('/redact/single', methods=['POST'])
def redact_single_file():
    compliance_map = {"1": "GDPR", "2": "HIPAA", "3": "DPDP"}
    compliance_num = request.form.get('complianceNum')
    compliance_type = compliance_map.get(compliance_num)
    if not compliance_type:
        return jsonify({"error": "Invalid compliance number. Use 1 (GDPR), 2 (HIPAA), or 3 (DPDP)."}), 400

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in [".pdf", ".txt", ".json", ".docx"]:
        return jsonify({"error": "Unsupported file type. Use PDF, TXT, JSON, or DOCX."}), 400

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}{file_ext}")
        file.save(temp_file_path)
        coordinator = CoordinatorAgent()
        output_path, audit_path = coordinator.handle_file(temp_file_path, compliance_type, temp_dir)
        if not output_path:
            return jsonify({"message": "No sensitive information detected", "audit_log": None})
        # Return both files as a zip
        zip_path = os.path.join(temp_dir, f"result_{uuid.uuid4()}.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(output_path, f"redacted/{os.path.basename(output_path)}")
            zipf.write(audit_path, f"audit_logs/{os.path.basename(audit_path)}")
        with open(zip_path, "rb") as f:
            zip_bytes = io.BytesIO(f.read())
            zip_bytes.seek(0)
            return send_file(
                zip_bytes,
                mimetype="application/zip",
                as_attachment=True,
                download_name="redacted_result.zip"
            )

@bp.route('/redact/multiple', methods=['POST'])
def redact_multiple_files():
    compliance_map = {"1": "GDPR", "2": "HIPAA", "3": "DPDP"}
    compliance_num = request.form.get('complianceNum')
    compliance_type = compliance_map.get(compliance_num)
    if not compliance_type:
        return jsonify({"error": "Invalid compliance number. Use 1 (GDPR), 2 (HIPAA), or 3 (DPDP)."}), 400

    files = request.files.getlist('files')
    if not files:
        return jsonify({"error": "No files provided"}), 400

    with tempfile.TemporaryDirectory() as temp_dir:
        coordinator = CoordinatorAgent()
        results = []
        for file in files:
            filename = secure_filename(file.filename)
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in [".pdf", ".txt", ".json", ".docx"]:
                continue
            temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}{file_ext}")
            file.save(temp_file_path)
            output_path, audit_path = coordinator.handle_file(temp_file_path, compliance_type, temp_dir)
            if output_path:
                results.append((output_path, audit_path))
        if not results:
            return jsonify({"message": "No sensitive information detected in any files", "files": []})
        zip_path = os.path.join(temp_dir, f"redacted_files_{uuid.uuid4()}.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for output_path, audit_path in results:
                zipf.write(output_path, f"redacted/{os.path.basename(output_path)}")
                zipf.write(audit_path, f"audit_logs/{os.path.basename(audit_path)}")
        with open(zip_path, "rb") as f:
            zip_bytes = io.BytesIO(f.read())
            zip_bytes.seek(0)
            return send_file(
                zip_bytes,
                mimetype="application/zip",
                as_attachment=True,
                download_name="redacted_batch.zip"
            )