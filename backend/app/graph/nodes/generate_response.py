"""Generate Response node — calls the LLM to produce the assistant's reply.

Uses the assembled message list from build_context and the conversation's
temperature setting. Supports both streaming and non-streaming modes.
"""
import logging

from app.graph.state import ConversationState
from app.services import llm_client
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)


async def generate_response(state: ConversationState) -> ConversationState:
    """Generate the assistant's reply using the LLM."""
    final_messages = state["final_messages"]
    temperature = state.get("temperature", 0.7)

    response_text = await llm_client.generate_response(
        final_messages,
        temperature=temperature,
    )

    response_tokens = count_tokens(response_text)

    logger.info(
        "Generated response for %s (%d tokens)",
        state["conversation_id"], response_tokens,
    )

    return {
        **state,
        "assistant_message": response_text,
        "response_tokens": response_tokens,
    }
