from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


DomainType = Literal["general", "technical", "creative", "business", "education"]


class PersonaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    system_prompt: str = Field(min_length=10)
    personality: str = ""
    domain: DomainType = "general"
    default_memory: str = "buffer"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class PersonaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    personality: Optional[str] = None
    domain: Optional[DomainType] = None
    default_memory: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class PersonaOut(BaseModel):
    id: str
    creator_id: Optional[str] = None
    name: str
    avatar_url: Optional[str] = None
    system_prompt: str
    personality: str
    domain: str
    default_memory: str
    temperature: float
    is_builtin: bool
    usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
