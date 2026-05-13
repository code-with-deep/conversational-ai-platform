"""Update KG node — extracts knowledge graph triples from the latest exchange.

Delegates to the existing kg_memory service. Only runs when the
conversation's memory_type is 'kg'.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.services import kg_memory

logger = logging.getLogger(__name__)


async def update_kg(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Run triple extraction if the memory strategy supports it."""
    memory_type = state.get("memory_type", "buffer")

    if memory_type != "kg":
        return {**state, "triples_extracted": 0}

    try:
        await kg_memory.update_memory(
            db,
            state["conversation_id"],
            state["user_message"],
            state["assistant_message"],
        )

        # count how many triples exist now
        triples = await kg_memory.get_triples(db, state["conversation_id"])
        count = len(triples)

        logger.info("KG update completed for %s (%d total)", state["conversation_id"], count)
        return {**state, "triples_extracted": count}

    except Exception as exc:
        logger.error("KG update failed for %s: %s", state["conversation_id"], exc)
        errors = state.get("errors", [])
        errors.append(f"kg_update: {exc}")
        return {**state, "triples_extracted": 0, "errors": errors}
