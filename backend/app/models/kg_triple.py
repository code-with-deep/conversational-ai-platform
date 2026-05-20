import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class KGTriple(Base):
    """Subject-predicate-object triple for the knowledge graph."""
    __tablename__ = "kg_triples"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    predicate: Mapped[str] = mapped_column(String(200), nullable=False)
    object_: Mapped[str] = mapped_column("object", String(300), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    source_message_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    conversation = relationship("Conversation", back_populates="kg_triples")
    source_message = relationship("Message", back_populates="sourced_triples")

    def __repr__(self):
        return f"<Triple ({self.subject}, {self.predicate}, {self.object_})>"
