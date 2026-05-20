"""Context window manager — allocates the token budget across sections.

The idea: we have a fixed budget (e.g. 4000 tokens). We split it into:
  - system prompt
  - memory context (summaries, entities, etc.)
  - recent messages
  - reserved for LLM response

The manager ensures the total never exceeds the budget.
"""
import logging
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.services.token_counter import count_tokens, count_message_tokens

logger = logging.getLogger(__name__)


@dataclass
class TokenBudget:
    system: int = 0
    memory: int = 0
    recent: int = 0
    response: int = 0
    total: int = 0
    budget_total: int = 0

    @property
    def used(self) -> int:
        return self.system + self.memory + self.recent

    @property
    def remaining(self) -> int:
        return max(0, self.budget_total - self.used - self.response)


def build_context(
    system_prompt: str,
    memory_text: str,
    recent_messages: list[dict],
    budget_total: int | None = None,
) -> tuple[list[dict], TokenBudget]:
    """Assemble the final message list that fits within the token budget.

    Returns:
        (messages, budget) — the messages to send and the token accounting.
    """
    settings = get_settings()
    total = budget_total or settings.token_budget_total

    budget = TokenBudget(budget_total=total, response=settings.token_budget_response)

    # 1. system prompt is always first priority
    system_tokens = count_tokens(system_prompt)
    budget.system = system_tokens

    final_messages = [{"role": "system", "content": system_prompt}]

    # 2. inject memory as a system-level context block (if present)
    if memory_text and memory_text.strip():
        mem_tokens = count_tokens(memory_text)
        max_mem = settings.token_budget_memory

        if mem_tokens > max_mem:
            from app.services.token_counter import truncate_to_tokens
            memory_text = truncate_to_tokens(memory_text, max_mem)
            mem_tokens = max_mem

        budget.memory = mem_tokens
        final_messages.append({
            "role": "system",
            "content": f"[Conversation Memory]\n{memory_text}",
        })

    # 3. fit as many recent messages as possible (newest first priority)
    space_for_recent = total - budget.system - budget.memory - budget.response
    recent_tokens = 0
    included = []

    for msg in reversed(recent_messages):
        msg_tokens = count_message_tokens(msg["role"], msg["content"])
        if recent_tokens + msg_tokens > space_for_recent:
            break
        recent_tokens += msg_tokens
        included.insert(0, msg)

    budget.recent = recent_tokens
    budget.total = budget.system + budget.memory + budget.recent

    final_messages.extend(included)

    logger.debug(
        "Context built: sys=%d mem=%d recent=%d (of %d msgs) budget=%d/%d",
        budget.system, budget.memory, budget.recent,
        len(included), budget.total, total,
    )

    return final_messages, budget
