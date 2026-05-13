"""Load State node — fetches conversation, persona, and memory from the database.

This is the first node in the graph. It hydrates the state with everything
the downstream nodes need: system prompt, temperature, memory context,
recent message history, and conversation metadata.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import ConversationState
from app.models.conversation import Conversation
from app.models.persona import Persona
from app.services.memory_manager import get_strategy

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI assistant. You are conversational, clear, "
    "and adapt your tone to the user's needs."
)


async def load_state(state: ConversationState, db: AsyncSession) -> ConversationState:
    """Populate the state with conversation data and memory context."""
    conversation_id = state["conversation_id"]
    user_id = state["user_id"]

    # fetch the conversation record
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise ValueError("Conversation not found")

    # fetch persona (if assigned)
    system_prompt = DEFAULT_SYSTEM_PROMPT
    temperature = 0.7

    if conv.persona_id:
        p_result = await db.execute(
            select(Persona).where(Persona.id == conv.persona_id)
        )
        persona = p_result.scalar_one_or_none()
        if persona:
            system_prompt = persona.system_prompt
            temperature = persona.temperature

    # load memory context via the strategy pattern
    strategy = get_strategy(conv.memory_type)
    memory_context = await strategy.get_memory_context(db, conversation_id)

    if hasattr(strategy, "get_recent_messages"):
        recent_messages = await strategy.get_recent_messages(db, conversation_id)
    else:
        from app.services.buffer_memory import get_recent_messages
        recent_messages = await get_recent_messages(db, conversation_id)

    logger.info(
        "State loaded for conversation %s (type=%s, memory_len=%d, recent=%d msgs)",
        conversation_id, conv.memory_type, len(memory_context), len(recent_messages),
    )

    return {
        **state,
        "conversation_title": conv.title,
        "memory_type": conv.memory_type,
        "memory_config": conv.memory_config or {},
        "persona_id": conv.persona_id,
        "system_prompt": system_prompt,
        "temperature": temperature,
        "message_count": conv.message_count,
        "total_tokens_used": conv.total_tokens_used,
        "memory_context": memory_context,
        "recent_messages": recent_messages,
        "errors": state.get("errors", []),
    }
