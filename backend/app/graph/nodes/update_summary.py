"""Update Summary node — triggers LLM summarization when the message threshold is met.

Delegates to the existing summary_memory service. Only runs when the
conversation's memory_type includes summary capabilities (summary or hybrid).
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.services import summary_memory

logger = logging.getLogger(__name__)


async def update_summary(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Run summary update if the memory strategy supports it."""
    memory_type = state.get("memory_type", "buffer")

    if memory_type not in ("summary", "hybrid"):
        return {**state, "summary_updated": False}

    try:
        await summary_memory.update_memory(
            db,
            state["conversation_id"],
            state["user_message"],
            state["assistant_message"],
        )
        logger.info("Summary update completed for %s", state["conversation_id"])
        return {**state, "summary_updated": True}

    except Exception as exc:
        logger.error("Summary update failed for %s: %s", state["conversation_id"], exc)
        errors = state.get("errors", [])
        errors.append(f"summary_update: {exc}")
        return {**state, "summary_updated": False, "errors": errors}
