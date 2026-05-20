"""Summary memory — compresses conversation history into a rolling summary.

Every N messages, the LLM generates a new summary that replaces the old one.
This keeps context window usage constant regardless of conversation length.
"""
import logging

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.message import Message
from app.models.conversation import Conversation
from app.models.conversation_summary import ConversationSummary
from app.services import llm_client
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)

SUMMARIZE_PROMPT = """You are a conversation summarizer. Given the existing summary and new messages, produce an updated summary that captures all important information, decisions, facts, and context.

Rules:
- Be concise but thorough
- Preserve specific names, dates, numbers, and decisions
- Merge new information with the existing summary
- Write in third person, past tense
- Keep it under 300 words

Existing summary:
{existing_summary}

New messages:
{new_messages}

Updated summary:"""


async def get_memory_context(
    db: AsyncSession,
    conversation_id: str,
) -> str:
    """Return the latest summary as the memory context."""
    result = await db.execute(
        select(ConversationSummary)
        .where(ConversationSummary.conversation_id == conversation_id)
        .order_by(ConversationSummary.version.desc())
        .limit(1)
    )
    summary = result.scalar_one_or_none()
    if summary:
        return f"Summary of conversation so far:\n{summary.summary_text}"
    return ""


async def get_recent_messages(
    db: AsyncSession,
    conversation_id: str,
    limit: int | None = None,
) -> list[dict]:
    """Return only the messages after the last summary."""
    max_msgs = limit or get_settings().max_recent_messages

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_msgs)
    )
    rows = result.scalars().all()
    return [
        {"role": m.role, "content": m.content}
        for m in reversed(rows)
    ]


async def update_memory(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """Check if we've hit the summary interval and generate a new summary."""
    # get current message count
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return

    settings = get_settings()
    if conv.message_count % settings.summary_interval != 0:
        return  # not time to summarize yet

    if conv.message_count < settings.summary_interval:
        return  # need at least N messages before first summary

    logger.info(
        "Generating summary for conversation %s (msg count: %d)",
        conversation_id, conv.message_count,
    )

    # get existing summary
    existing = await get_memory_context(db, conversation_id)
    existing_text = existing.replace("Summary of conversation so far:\n", "")

    # get recent unsummarized messages
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(settings.summary_interval)
    )
    recent = result.scalars().all()
    new_text = "\n".join(
        f"{m.role}: {m.content}" for m in reversed(recent)
    )

    # ask the LLM to summarize
    prompt = SUMMARIZE_PROMPT.format(
        existing_summary=existing_text or "(no existing summary)",
        new_messages=new_text,
    )

    summary_text = await llm_client.generate_response(
        [{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    # get the current version number
    version_result = await db.execute(
        select(func.max(ConversationSummary.version))
        .where(ConversationSummary.conversation_id == conversation_id)
    )
    current_version = version_result.scalar() or 0

    # save the new summary
    new_summary = ConversationSummary(
        conversation_id=conversation_id,
        summary_text=summary_text.strip(),
        messages_covered=conv.message_count,
        token_count=count_tokens(summary_text),
        version=current_version + 1,
    )
    db.add(new_summary)
    await db.flush()

    logger.info(
        "Saved summary v%d for conversation %s (%d tokens)",
        new_summary.version, conversation_id, new_summary.token_count,
    )
