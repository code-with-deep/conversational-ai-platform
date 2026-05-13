from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    token_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
