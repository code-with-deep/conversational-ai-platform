"""Build Context node — assembles the final prompt within the token budget.

Takes the system prompt, memory context, and recent messages from state,
runs them through the context window manager, and stores the assembled
message list and token accounting back into the state.
"""
import logging

from app.graph.state import ConversationState
from app.services.context_manager import build_context as assemble_context

logger = logging.getLogger(__name__)


async def build_context(state: ConversationState) -> ConversationState:
    """Assemble the final message list that fits within the token budget."""
    system_prompt = state["system_prompt"]
    memory_context = state.get("memory_context", "")
    recent_messages = state.get("recent_messages", [])

    final_messages, budget = assemble_context(
        system_prompt=system_prompt,
        memory_text=memory_context,
        recent_messages=recent_messages,
    )

    logger.info(
        "Context assembled for %s: sys=%d mem=%d recent=%d total=%d/%d",
        state["conversation_id"],
        budget.system, budget.memory, budget.recent,
        budget.total, budget.budget_total,
    )

    return {
        **state,
        "final_messages": final_messages,
        "token_budget_system": budget.system,
        "token_budget_memory": budget.memory,
        "token_budget_recent": budget.recent,
        "token_budget_total": budget.total,
        "token_budget_limit": budget.budget_total,
    }
