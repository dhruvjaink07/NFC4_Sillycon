from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import zipfile
import tempfile
from contextlib import asynccontextmanager

from config import initialize_models, ensure_upload_folder, gliner_model, llm_model
from agents import CoordinatorAgent
from utils import save_upload_file, cleanup_files, validate_compliance_number
from models import SingleFileResponse, MultipleFileResponse, ErrorResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Multi-Agent Sensitive Data Redaction API")
    print("=" * 60)
    initialize_models()
    ensure_upload_folder()
    print("✅ API Ready!")
    yield
    print("👋 Shutting down API")

app = FastAPI(
    title="Data Redaction API",
    description="Multi-Agent Sensitive Data Redaction System with GLiNER",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Multi-Agent Sensitive Data Redaction API", 
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "gliner_loaded": gliner_model is not None,
        "llm_loaded": llm_model is not None
    }

@app.post("/redact/single", response_model=SingleFileResponse)
async def redact_single_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    complianceNum: int = Form(...)
):
    temp_file_path = None
    redacted_file_path = None
    audit_log_path = None

    try:
        compliance_type = validate_compliance_number(complianceNum)
        temp_file_path = await save_upload_file(file)
        coordinator = CoordinatorAgent(gliner_model, llm_model)
        result = coordinator.process_single_file(temp_file_path, compliance_type)

        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        redacted_file_path = result["redacted_file"]
        audit_log_path = result["audit_log"]

        if not redacted_file_path:
            return SingleFileResponse(
                status="success",
                message="No sensitive information detected in the file",
                redacted_file=None,
                audit_log=None,
                redacted_items_count=0
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as zip_temp:
            with zipfile.ZipFile(zip_temp.name, 'w') as zipf:
                if os.path.exists(redacted_file_path):
                    zipf.write(redacted_file_path, os.path.basename(redacted_file_path))
                if audit_log_path and os.path.exists(audit_log_path):
                    zipf.write(audit_log_path, os.path.basename(audit_log_path))
            zip_path = zip_temp.name

        background_tasks.add_task(cleanup_files, temp_file_path, redacted_file_path, audit_log_path, zip_path)

        return FileResponse(
            path=zip_path,
            filename=f"redacted_{file.filename.rsplit('.', 1)[0]}.zip",
            media_type="application/zip"
        )

    except HTTPException as e:
        cleanup_files(temp_file_path, redacted_file_path, audit_log_path)
        raise
    except Exception as e:
        cleanup_files(temp_file_path, redacted_file_path, audit_log_path)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/redact/multiple", response_model=MultipleFileResponse)
async def redact_multiple_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    complianceNum: int = Form(...)
):
    temp_file_paths = []
    output_files = []

    try:
        compliance_type = validate_compliance_number(complianceNum)

        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 files allowed")

        for file in files:
            temp_path = await save_upload_file(file)
            temp_file_paths.append(temp_path)

        coordinator = CoordinatorAgent(gliner_model, llm_model)
        results = coordinator.process_multiple_files(temp_file_paths, compliance_type)

        successful_count = sum(1 for r in results if r["status"] == "success" and r["redacted_file"])
        failed_count = len(results) - successful_count

        for result in results:
            if result["status"] == "success" and result["redacted_file"]:
                if os.path.exists(result["redacted_file"]):
                    output_files.append(result["redacted_file"])
                if result["audit_log"] and os.path.exists(result["audit_log"]):
                    output_files.append(result["audit_log"])

        if not output_files:
            return MultipleFileResponse(
                status="success",
                message="No sensitive information detected in any files",
                total_files=len(files),
                successful_files=0,
                failed_files=0,
                results=results
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as zip_temp:
            with zipfile.ZipFile(zip_temp.name, 'w') as zipf:
                for file_path in output_files:
                    if os.path.exists(file_path):
                        zipf.write(file_path, os.path.basename(file_path))
            zip_path = zip_temp.name

        background_tasks.add_task(cleanup_files, *temp_file_paths, *output_files, zip_path)

        return FileResponse(
            path=zip_path,
            filename="redacted_files.zip",
            media_type="application/zip"
        )

    except HTTPException as e:
        cleanup_files(*temp_file_paths, *output_files)
        raise
    except Exception as e:
        cleanup_files(*temp_file_paths, *output_files)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/compliance-types")
async def get_compliance_types():
    from config import COMPLIANCE_MAPPING
    return {
        "compliance_types": [
            {"number": k, "name": v, "description": f"{v} compliance standards"}
            for k, v in COMPLIANCE_MAPPING.items()
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)