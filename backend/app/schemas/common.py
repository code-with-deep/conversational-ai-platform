from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "OK"
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[str] = None


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int


class PaginatedResponse(BaseModel):
    success: bool = True
    data: list[Any]
    meta: PaginationMeta


class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None
