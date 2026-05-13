"""Message service — orchestrates the AI response via LangGraph.

Two execution modes:
  - send_message:   full graph execution via ainvoke() (non-streaming)
  - stream_message: sequential node calls with real LLM token streaming
"""
import logging
import traceback
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.builder import build_conversation_graph
from app.graph.state import ConversationState
from app.graph.nodes.load_state import load_state
from app.graph.nodes.classify_intent import classify_intent
from app.graph.nodes.build_context import build_context
from app.graph.nodes.persist_message import persist_message
from app.graph.nodes.update_summary import update_summary
from app.graph.nodes.update_entities import update_entities
from app.graph.nodes.update_kg import update_kg
from app.graph.nodes.refine_response import refine_response
from app.services import llm_client
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)


async def send_message(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
    content: str,
) -> str:
    """Full non-streaming message flow via LangGraph."""
    initial_state: ConversationState = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "user_message": content,
    }

    graph = build_conversation_graph(db)
    final_state = await graph.ainvoke(initial_state)

    return final_state["assistant_message"]


async def stream_message(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
    content: str,
) -> AsyncGenerator[str, None]:
    """Streaming flow: runs graph nodes sequentially with real LLM token streaming.

    LangGraph's ainvoke() cannot yield tokens mid-execution, so for streaming
    we call the node functions directly in order, inserting the streaming LLM
    call in place of the generate_response node.
    """
    state: ConversationState = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "user_message": content,
    }

    # --- Phase A: pre-generation (load → classify → build context) ---
    state = await load_state(state, db=db)
    state = await classify_intent(state)
    state = await build_context(state)

    # --- Phase B: stream the LLM response token-by-token ---
    final_messages = state["final_messages"]
    temperature = state.get("temperature", 0.7)

    full_response = []
    async for chunk in llm_client.stream_response(final_messages, temperature=temperature):
        full_response.append(chunk)
        yield chunk

    response_text = "".join(full_response)
    response_tokens = count_tokens(response_text)

    state = {
        **state,
        "assistant_message": response_text,
        "response_tokens": response_tokens,
    }

    # --- Phase C: post-generation (persist → memory updates → refine) ---
    state = await persist_message(state, db=db)

    # run memory updates based on memory type
    memory_type = state.get("memory_type", "buffer")
    try:
        if memory_type in ("summary", "hybrid"):
            state = await update_summary(state, db=db)
        if memory_type in ("entity", "hybrid"):
            state = await update_entities(state, db=db)
        if memory_type == "kg":
            state = await update_kg(state, db=db)
    except Exception as exc:
        logger.error(
            "Memory update failed during stream for %s: %s\n%s",
            conversation_id, exc, traceback.format_exc(),
        )

    # refinement check
    try:
        state = await refine_response(state, db=db)
    except Exception as exc:
        logger.error("Refinement failed during stream for %s: %s", conversation_id, exc)

    await db.commit()
    logger.info(
        "Stream completed for %s (intent=%s, tokens=%d)",
        conversation_id, state.get("intent"), response_tokens,
    )
