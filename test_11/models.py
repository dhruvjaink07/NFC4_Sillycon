from pydantic import BaseModel
from typing import List, Optional


class SingleFileResponse(BaseModel):
    status: str
    message: str
    redacted_file: Optional[str] = None
    audit_log: Optional[str] = None
    redacted_items_count: Optional[int] = None


class MultipleFileResponse(BaseModel):
    status: str
    message: str
    total_files: int
    successful_files: int
    failed_files: int
    results: List[dict]


class ErrorResponse(BaseModel):
    status: str
    message: str
    detail: Optional[str] = None