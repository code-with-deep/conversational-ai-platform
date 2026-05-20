"""Memory manager factory — selects the right memory strategy per conversation.

This is the Strategy Pattern in action. Instead of if/else chains
throughout the code, we pick the strategy once and use a uniform interface.
"""
import logging
from types import ModuleType

from app.services import buffer_memory, summary_memory, entity_memory, kg_memory, hybrid_memory

logger = logging.getLogger(__name__)

_STRATEGIES: dict[str, ModuleType] = {
    "buffer": buffer_memory,
    "summary": summary_memory,
    "entity": entity_memory,
    "kg": kg_memory,
    "hybrid": hybrid_memory,
}


def get_strategy(memory_type: str) -> ModuleType:
    """Return the memory module for the given type.

    Each module exposes:
        - get_memory_context(db, conversation_id) -> str
        - get_recent_messages(db, conversation_id, limit) -> list[dict]
        - update_memory(db, conversation_id, user_msg, assistant_msg) -> None
    """
    strategy = _STRATEGIES.get(memory_type)
    if strategy is None:
        logger.warning("Unknown memory type '%s', falling back to buffer", memory_type)
        strategy = buffer_memory
    return strategy
