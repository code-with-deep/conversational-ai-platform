import logging
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.entity import Entity
from app.models.kg_triple import KGTriple
from app.models.conversation_summary import ConversationSummary

logger = logging.getLogger(__name__)


async def create_conversation(
    db: AsyncSession,
    user_id: str,
    title: str = "New Conversation",
    persona_id: Optional[str] = None,
    memory_type: str = "buffer",
    memory_config: Optional[dict] = None,
) -> Conversation:
    conv = Conversation(
        user_id=user_id,
        title=title,
        persona_id=persona_id,
        memory_type=memory_type,
        memory_config=memory_config or {},
    )
    db.add(conv)
    await db.flush()
    logger.info("Created conversation '%s' for user %s", title, user_id)
    return conv


async def list_conversations(
    db: AsyncSession,
    user_id: str,
    search: Optional[str] = None,
    pinned_only: bool = False,
    archived: bool = False,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Conversation], int]:
    """Return paginated conversations for a user with optional filters."""
    query = select(Conversation).where(
        Conversation.user_id == user_id,
        Conversation.is_archived == archived,
    )

    if pinned_only:
        query = query.where(Conversation.is_pinned == True)  # noqa: E712

    if search:
        pattern = f"%{search}%"
        query = query.where(Conversation.title.ilike(pattern))

    # total count before pagination
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # fetch page
    query = query.order_by(Conversation.updated_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    conversations = list(result.scalars().all())

    return conversations, total


async def get_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Optional[Conversation]:
    """Fetch a single conversation with its messages eagerly loaded."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Optional[dict]:
    """Build a full detail view including memory state counts."""
    conv = await get_conversation(db, conversation_id, user_id)
    if conv is None:
        return None

    # count entities
    e_count = (await db.execute(
        select(func.count()).where(Entity.conversation_id == conversation_id)
    )).scalar() or 0

    # count triples
    t_count = (await db.execute(
        select(func.count()).where(KGTriple.conversation_id == conversation_id)
    )).scalar() or 0

    # latest summary
    summary_result = await db.execute(
        select(ConversationSummary)
        .where(ConversationSummary.conversation_id == conversation_id)
        .order_by(ConversationSummary.version.desc())
        .limit(1)
    )
    latest_summary = summary_result.scalar_one_or_none()

    messages_data = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "token_count": m.token_count,
            "created_at": m.created_at.isoformat(),
        }
        for m in conv.messages
    ]

    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "persona_id": conv.persona_id,
        "title": conv.title,
        "memory_type": conv.memory_type,
        "memory_config": conv.memory_config,
        "is_pinned": conv.is_pinned,
        "is_archived": conv.is_archived,
        "message_count": conv.message_count,
        "total_tokens_used": conv.total_tokens_used,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": messages_data,
        "summary": latest_summary.summary_text if latest_summary else None,
        "entity_count": e_count,
        "triple_count": t_count,
    }


async def update_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
    **fields,
) -> Optional[Conversation]:
    conv = await get_conversation(db, conversation_id, user_id)
    if conv is None:
        return None

    for key, value in fields.items():
        if value is not None and hasattr(conv, key):
            setattr(conv, key, value)

    await db.flush()
    return conv


async def delete_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> bool:
    conv = await get_conversation(db, conversation_id, user_id)
    if conv is None:
        return False

    await db.delete(conv)
    await db.flush()
    logger.info("Deleted conversation %s", conversation_id)
    return True
