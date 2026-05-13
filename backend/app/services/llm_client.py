"""Async wrapper around Groq's ChatGroq for streaming and non-streaming calls."""
import logging
from typing import AsyncGenerator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: ChatGroq | None = None


def _get_client() -> ChatGroq:
    """Lazy-init the ChatGroq client so we don't fail at import time."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0.7,
            streaming=True,
        )
        logger.info("Initialized ChatGroq client (model=%s)", settings.groq_model)
    return _client


def build_langchain_messages(messages: list[dict]) -> list:
    """Convert our internal message format to LangChain message objects.

    Each dict must have 'role' (system|user|assistant) and 'content'.
    """
    mapping = {
        "system": SystemMessage,
        "user": HumanMessage,
        "assistant": AIMessage,
    }
    result = []
    for msg in messages:
        cls = mapping.get(msg["role"], HumanMessage)
        result.append(cls(content=msg["content"]))
    return result


async def generate_response(
    messages: list[dict],
    temperature: float = 0.7,
) -> str:
    """Send messages to Groq and return the full response string."""
    client = _get_client()
    client.temperature = temperature

    lc_messages = build_langchain_messages(messages)
    response = await client.ainvoke(lc_messages)
    return response.content


async def stream_response(
    messages: list[dict],
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream tokens from Groq one chunk at a time."""
    client = _get_client()
    client.temperature = temperature

    lc_messages = build_langchain_messages(messages)

    async for chunk in client.astream(lc_messages):
        if chunk.content:
            yield chunk.content
