import os
import uuid
import aiofiles
import zipfile
from fastapi import UploadFile, HTTPException
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from config import SUPPORTED_EXTENSIONS, MAX_FILE_SIZE, UPLOAD_FOLDER

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temporary location with streaming and validation"""
    # Validate file extension
    file_ext = os.path.splitext(upload_file.filename)[1].lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    # Stream file content to avoid memory issues
    total_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            while True:
                chunk = await upload_file.read(1024 * 1024)  # Read 1MB chunks
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
                    )
                await f.write(chunk)
        logger.debug(f"Saved file to {file_path}, size: {total_size} bytes")
        # Reset file pointer for potential re-reading
        await upload_file.seek(0)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"Error saving file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Validate DOCX if applicable
    if file_ext == ".docx":
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                logger.debug(f"Testing ZIP integrity for {file_path}")
                test_result = zip_ref.testzip()
                if test_result is not None:
                    raise zipfile.BadZipFile(f"Invalid DOCX: Corrupted file at {test_result}")
                logger.debug(f"ZIP validation passed for {file_path}")
        except zipfile.BadZipFile as e:
            os.remove(file_path)
            logger.error(f"Invalid DOCX file {file_path}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid DOCX file: {str(e)}")
        except Exception as e:
            os.remove(file_path)
            logger.error(f"Unable to validate ZIP structure for {file_path}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid DOCX file: Unable to validate ZIP structure - {str(e)}")
    
    return file_path

def cleanup_files(*file_paths):
    """Clean up temporary files"""
    for file_path in file_paths:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

def validate_compliance_number(compliance_num: int) -> str:
    """Validate and convert compliance number to type"""
    from config import COMPLIANCE_MAPPING
    
    if compliance_num not in COMPLIANCE_MAPPING:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid compliance number. Use 1 (GDPR), 2 (HIPAA), or 3 (DPDP)"
        )
    
    return COMPLIANCE_MAPPING[compliance_num]