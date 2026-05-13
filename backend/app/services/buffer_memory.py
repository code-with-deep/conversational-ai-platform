"""Buffer memory — the simplest strategy.

Just keeps the last N messages in raw form. No compression,
no summarization. Fast, cheap, but eats tokens quickly.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.message import Message

logger = logging.getLogger(__name__)


async def get_memory_context(
    db: AsyncSession,
    conversation_id: str,
) -> str:
    """Buffer memory returns an empty string — recent messages are handled
    by the context manager's recent-message window directly."""
    return ""


async def get_recent_messages(
    db: AsyncSession,
    conversation_id: str,
    limit: int | None = None,
) -> list[dict]:
    """Fetch the last N messages for this conversation."""
    max_msgs = limit or get_settings().max_recent_messages

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_msgs)
    )
    rows = result.scalars().all()

    # reverse so oldest is first (chronological order)
    return [
        {"role": m.role, "content": m.content}
        for m in reversed(rows)
    ]


async def update_memory(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """Buffer memory has no post-processing step."""
    pass
