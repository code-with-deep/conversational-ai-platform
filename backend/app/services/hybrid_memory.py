"""Hybrid memory — combines Summary + Entity strategies.

This gives the AI both a compressed narrative (summary) and specific
factual recall (entities). Best for long conversations where both
context and precision matter.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import summary_memory, entity_memory
from app.services.buffer_memory import get_recent_messages as buffer_recent

logger = logging.getLogger(__name__)


async def get_memory_context(
    db: AsyncSession,
    conversation_id: str,
) -> str:
    """Combine summary and entity contexts."""
    summary_ctx = await summary_memory.get_memory_context(db, conversation_id)
    entity_ctx = await entity_memory.get_memory_context(db, conversation_id)

    parts = []
    if summary_ctx:
        parts.append(summary_ctx)
    if entity_ctx:
        parts.append(entity_ctx)

    return "\n\n".join(parts)


async def get_recent_messages(
    db: AsyncSession,
    conversation_id: str,
    limit: int | None = None,
) -> list[dict]:
    """Use the standard buffer for recent messages."""
    return await buffer_recent(db, conversation_id, limit)


async def update_memory(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """Run both summary and entity updates."""
    await summary_memory.update_memory(db, conversation_id, user_message, assistant_message)
    await entity_memory.update_memory(db, conversation_id, user_message, assistant_message)
