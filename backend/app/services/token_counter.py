"""Lightweight token counter using tiktoken.

Uses cl100k_base encoding (same as GPT-4/ChatGPT) for consistent
estimates regardless of which LLM is actually serving the request.
"""
import tiktoken

_encoding = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Return the approximate token count for a string."""
    if not text:
        return 0
    return len(_encoding.encode(text))


def count_message_tokens(role: str, content: str) -> int:
    """Estimate tokens for a single chat message (role + content + framing)."""
    # every message has ~4 overhead tokens for role delimiters
    return count_tokens(role) + count_tokens(content) + 4


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to fit within a token limit."""
    tokens = _encoding.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return _encoding.decode(tokens[:max_tokens])
