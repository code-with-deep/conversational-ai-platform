import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Float, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    creator_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    personality: Mapped[str] = mapped_column(Text, default="")
    domain: Mapped[str] = mapped_column(
        String(30), default="general"
    )  # general | technical | creative | business | education
    default_memory: Mapped[str] = mapped_column(String(20), default="buffer")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    creator = relationship("User", back_populates="custom_personas")
    conversations = relationship("Conversation", back_populates="persona")

    def __repr__(self):
        return f"<Persona {self.name}>"
