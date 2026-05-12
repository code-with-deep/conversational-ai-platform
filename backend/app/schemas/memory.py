from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EntityOut(BaseModel):
    id: str
    conversation_id: str
    name: str
    entity_type: str
    description: str
    mention_count: int
    is_global: bool
    first_seen: datetime
    last_updated: datetime

    model_config = {"from_attributes": True}


class EntityVersionOut(BaseModel):
    id: str
    entity_id: str
    description: str
    version: int
    source_message_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class KGTripleOut(BaseModel):
    id: str
    conversation_id: str
    subject: str
    predicate: str
    object_: str
    confidence: float
    source_message_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SummaryOut(BaseModel):
    id: str
    conversation_id: str
    summary_text: str
    messages_covered: int
    token_count: int
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenUsageOut(BaseModel):
    system_tokens: int = 0
    memory_tokens: int = 0
    recent_tokens: int = 0
    response_tokens: int = 0
    total_tokens: int = 0
    budget_total: int = 4000

    model_config = {"from_attributes": True}


class MemoryStateOut(BaseModel):
    """Aggregated memory state for a conversation."""
    memory_type: str
    entities: list[EntityOut] = []
    triples: list[KGTripleOut] = []
    summary: Optional[SummaryOut] = None
    token_usage: Optional[TokenUsageOut] = None
