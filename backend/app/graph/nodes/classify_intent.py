"""Classify Intent node — determines the user's intent from their message.

The intent affects downstream routing:
  - question     → full memory enrichment + detailed response
  - instruction  → focused response, entity extraction
  - small_talk   → light response, minimal memory updates
  - recall       → emphasize entity/KG context retrieval
"""
import json
import logging

from app.graph.state import ConversationState
from app.services import llm_client

logger = logging.getLogger(__name__)

CLASSIFY_PROMPT = """Classify the user's message into exactly one category.

Categories:
- question: The user is asking for NEW information or general knowledge
- instruction: The user is giving a command or task
- small_talk: Casual greeting, thanks, or social conversation
- recall: The user is asking about themselves, their preferences, or anything mentioned earlier in this specific conversation (e.g., "What is my name?", "What did I say earlier?")

Respond with ONLY the category name, nothing else.

User message: {message}

Category:"""

VALID_INTENTS = {"question", "instruction", "small_talk", "recall"}


async def classify_intent(state: ConversationState) -> ConversationState:
    """Use the LLM to classify the user's intent."""
    user_message = state["user_message"]

    try:
        prompt = CLASSIFY_PROMPT.format(message=user_message)
        raw = await llm_client.generate_response(
            [{"role": "user", "content": prompt}],
            temperature=0.0,
        )

        intent = raw.strip().lower().replace(".", "").replace('"', '')

        # handle multi-word responses by taking the first valid word
        for word in intent.split():
            if word in VALID_INTENTS:
                intent = word
                break
        else:
            if intent not in VALID_INTENTS:
                intent = "question"  # safe default

    except Exception as exc:
        logger.warning("Intent classification failed: %s — defaulting to 'question'", exc)
        intent = "question"

    logger.info("Classified intent for conversation %s: %s", state["conversation_id"], intent)

    return {**state, "intent": intent}
