"""Persist Message node — saves user and assistant messages to the database.

Also bumps conversation counters (message_count, total_tokens_used)
and logs token usage for observability.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.token_usage import TokenUsageLog
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)


async def persist_message(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Save the user message and assistant response to the database."""
    conversation_id = state["conversation_id"]
    user_content = state["user_message"]
    assistant_content = state["assistant_message"]

    user_tokens = count_tokens(user_content)
    assistant_tokens = state.get("response_tokens", count_tokens(assistant_content))

    # save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_content,
        token_count=user_tokens,
    )
    db.add(user_msg)

    # save assistant message
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content,
        token_count=assistant_tokens,
    )
    db.add(assistant_msg)

    # bump conversation counters
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one_or_none()
    if conv:
        conv.message_count += 2  # user + assistant
        conv.total_tokens_used += user_tokens + assistant_tokens
        conv.updated_at = datetime.now(timezone.utc)

    await db.flush()

    # log token usage
    token_log = TokenUsageLog(
        conversation_id=conversation_id,
        message_id=assistant_msg.id,
        system_tokens=state.get("token_budget_system", 0),
        memory_tokens=state.get("token_budget_memory", 0),
        recent_tokens=state.get("token_budget_recent", 0),
        response_tokens=assistant_tokens,
        total_tokens=state.get("token_budget_total", 0) + assistant_tokens,
        budget_total=state.get("token_budget_limit", 4000),
    )
    db.add(token_log)
    await db.flush()

    logger.info(
        "Persisted messages for %s (user_msg=%s, assistant_msg=%s)",
        conversation_id, user_msg.id, assistant_msg.id,
    )

    return {
        **state,
        "user_message_id": user_msg.id,
        "assistant_message_id": assistant_msg.id,
        "message_count": (state.get("message_count", 0) + 2),
    }
