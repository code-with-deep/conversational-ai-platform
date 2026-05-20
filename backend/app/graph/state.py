"""Conversation graph state — the single TypedDict that flows through every node.

Every node in the LangGraph workflow reads from and writes to this shared state.
The state is NOT persisted between requests; it is built fresh for each user message
and discarded after the response is delivered. Database persistence happens inside
specific nodes (persist_message, update_entities, etc.).
"""
from typing import TypedDict, Optional


class ConversationState(TypedDict, total=False):
    """Typed state schema for the LangGraph conversation workflow.

    Fields are grouped by lifecycle stage:
      1. Input       — provided by the API caller
      2. Loaded      — populated by load_state
      3. Classified  — populated by classify_intent
      4. Context     — populated by build_context
      5. Generated   — populated by generate_response
      6. Persisted   — populated by persist_message
      7. Memory      — populated by update_summary / update_entities / update_kg
      8. Refined     — populated by refine_response
    """

    # --- 1. Input (set by the API layer before graph execution) ---
    conversation_id: str
    user_id: str
    user_message: str

    # --- 2. Loaded (set by load_state node) ---
    conversation_title: str
    memory_type: str
    memory_config: dict
    persona_id: Optional[str]
    system_prompt: str
    temperature: float
    message_count: int
    total_tokens_used: int

    # memory context loaded from DB
    memory_context: str          # rendered summary / entity sheet / KG text
    recent_messages: list[dict]  # [{role, content}, ...]

    # --- 3. Classified (set by classify_intent node) ---
    intent: str                  # question | instruction | small_talk | recall

    # --- 4. Context (set by build_context node) ---
    final_messages: list[dict]   # the assembled message list sent to the LLM
    token_budget_system: int
    token_budget_memory: int
    token_budget_recent: int
    token_budget_total: int
    token_budget_limit: int

    # --- 5. Generated (set by generate_response node) ---
    assistant_message: str
    response_tokens: int

    # --- 6. Persisted (set by persist_message node) ---
    user_message_id: str
    assistant_message_id: str

    # --- 7. Memory updates (set by update nodes) ---
    summary_updated: bool
    entities_extracted: int
    triples_extracted: int

    # --- 8. Refined (set by refine_response node) ---
    quality_passed: bool
    refinement_reason: Optional[str]

    # --- Error tracking ---
    errors: list[str]
