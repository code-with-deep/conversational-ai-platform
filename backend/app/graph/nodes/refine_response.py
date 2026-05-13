"""Refine Response node — quality check and optional re-generation.

After memory updates, this node checks whether the assistant's response
properly references known entities when the user asked about them.
If the check fails, it re-generates with the entities explicitly injected
into the prompt.

This implements the "refinement loop" described in the architecture.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.services import entity_memory, llm_client
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)


async def refine_response(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Check quality and optionally re-generate the response."""
    intent = state.get("intent", "question")
    memory_type = state.get("memory_type", "buffer")
    assistant_message = state.get("assistant_message", "")

    # only run quality check for recall intents with entity-aware memory
    if intent != "recall" or memory_type not in ("entity", "hybrid"):
        return {**state, "quality_passed": True, "refinement_reason": None}

    # get known entities
    entities = await entity_memory.get_entities(db, state["conversation_id"])
    if not entities:
        return {**state, "quality_passed": True, "refinement_reason": None}

    # build entity name list
    entity_names = [e.name.lower() for e in entities]

    # check if the response mentions at least one known entity
    response_lower = assistant_message.lower()
    mentioned = [name for name in entity_names if name in response_lower]

    if mentioned:
        logger.info("Quality check passed: response mentions %d entities", len(mentioned))
        return {**state, "quality_passed": True, "refinement_reason": None}

    # quality check FAILED — re-generate with entity injection
    logger.warning(
        "Quality check failed for %s: response doesn't mention any known entities. Re-generating.",
        state["conversation_id"],
    )

    entity_sheet = "\n".join(
        f"- {e.name} ({e.entity_type}): {e.description}" for e in entities[:10]
    )

    # rebuild prompt with explicit entity context
    enriched_messages = state["final_messages"].copy()
    enriched_messages.insert(1, {
        "role": "system",
        "content": (
            "[Entity Memory — Reference these facts in your response]\n"
            f"{entity_sheet}"
        ),
    })

    refined_text = await llm_client.generate_response(
        enriched_messages,
        temperature=state.get("temperature", 0.7),
    )

    # update the persisted assistant message in DB
    from app.models.message import Message
    from sqlalchemy import select

    msg_result = await db.execute(
        select(Message).where(Message.id == state.get("assistant_message_id"))
    )
    msg = msg_result.scalar_one_or_none()
    if msg:
        msg.content = refined_text
        msg.token_count = count_tokens(refined_text)
        await db.flush()

    logger.info("Refined response for %s (reason: missing entity references)", state["conversation_id"])

    return {
        **state,
        "assistant_message": refined_text,
        "response_tokens": count_tokens(refined_text),
        "quality_passed": False,
        "refinement_reason": "Response did not reference known entities on a recall-type query",
    }
