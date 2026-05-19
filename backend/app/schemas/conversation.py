from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


MemoryType = Literal["buffer", "summary", "entity", "kg", "hybrid"]


class ConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", max_length=300)
    persona_id: Optional[str] = None
    memory_type: MemoryType = "buffer"
    memory_config: Optional[dict] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    memory_type: Optional[MemoryType] = None
    memory_config: Optional[dict] = None


class ConversationOut(BaseModel):
    id: str
    user_id: str
    persona_id: Optional[str] = None
    title: str
    memory_type: str
    memory_config: Optional[dict] = None
    is_pinned: bool
    is_archived: bool
    message_count: int
    total_tokens_used: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationOut):
    messages: list[dict] = Field(default_factory=list)
    summary: Optional[str] = None
    entity_count: int = 0
    triple_count: int = 0
