"""Update Entities node — extracts named entities from the latest exchange.

Delegates to the existing entity_memory service. Only runs when the
conversation's memory_type includes entity capabilities (entity or hybrid).
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.services import entity_memory

logger = logging.getLogger(__name__)


async def update_entities(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Run entity extraction if the memory strategy supports it."""
    memory_type = state.get("memory_type", "buffer")

    if memory_type not in ("entity", "hybrid"):
        return {**state, "entities_extracted": 0}

    try:
        await entity_memory.update_memory(
            db,
            state["conversation_id"],
            state["user_message"],
            state["assistant_message"],
        )

        # count how many entities exist now
        entities = await entity_memory.get_entities(db, state["conversation_id"])
        count = len(entities)

        logger.info("Entity update completed for %s (%d total)", state["conversation_id"], count)
        return {**state, "entities_extracted": count}

    except Exception as exc:
        logger.error("Entity update failed for %s: %s", state["conversation_id"], exc)
        errors = state.get("errors", [])
        errors.append(f"entity_update: {exc}")
        return {**state, "entities_extracted": 0, "errors": errors}
