import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    persona_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("personas.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), default="New Conversation")
    memory_type: Mapped[str] = mapped_column(
        String(20), default="buffer", nullable=False
    )  # buffer | summary | entity | kg | hybrid
    memory_config: Mapped[dict | None] = mapped_column(JSON, default=dict)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    # relationships
    user = relationship("User", back_populates="conversations")
    persona = relationship("Persona", back_populates="conversations")
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    summaries = relationship(
        "ConversationSummary", back_populates="conversation", cascade="all, delete-orphan"
    )
    entities = relationship(
        "Entity", back_populates="conversation", cascade="all, delete-orphan"
    )
    kg_triples = relationship(
        "KGTriple", back_populates="conversation", cascade="all, delete-orphan"
    )
    token_logs = relationship(
        "TokenUsageLog", back_populates="conversation", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Conversation {self.title[:30]}>"
