"""Stats endpoint — aggregate memory statistics across the user's data."""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.entity import Entity
from app.models.kg_triple import KGTriple
from app.models.conversation_summary import ConversationSummary
from app.models.token_usage import TokenUsageLog

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Stats"])


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate memory statistics for the authenticated user."""
    user_id = current_user.id

    # conversation counts
    conv_q = select(func.count()).select_from(Conversation).where(
        Conversation.user_id == user_id
    )
    total_conversations = (await db.execute(conv_q)).scalar() or 0

    active_q = select(func.count()).select_from(Conversation).where(
        Conversation.user_id == user_id,
        Conversation.is_archived == False,  # noqa: E712
    )
    active_conversations = (await db.execute(active_q)).scalar() or 0

    # message count
    msg_q = (
        select(func.count())
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.user_id == user_id)
    )
    total_messages = (await db.execute(msg_q)).scalar() or 0

    # entity count
    ent_q = (
        select(func.count())
        .select_from(Entity)
        .where(Entity.user_id == user_id)
    )
    total_entities = (await db.execute(ent_q)).scalar() or 0

    # triple count
    tri_q = (
        select(func.count())
        .select_from(KGTriple)
        .where(KGTriple.user_id == user_id)
    )
    total_triples = (await db.execute(tri_q)).scalar() or 0

    # summary count
    sum_q = (
        select(func.count())
        .select_from(ConversationSummary)
        .join(Conversation, ConversationSummary.conversation_id == Conversation.id)
        .where(Conversation.user_id == user_id)
    )
    total_summaries = (await db.execute(sum_q)).scalar() or 0

    # total tokens used across all conversations
    tok_q = (
        select(func.coalesce(func.sum(Conversation.total_tokens_used), 0))
        .where(Conversation.user_id == user_id)
    )
    total_tokens = (await db.execute(tok_q)).scalar() or 0

    # memory type distribution
    dist_q = (
        select(Conversation.memory_type, func.count())
        .where(Conversation.user_id == user_id)
        .group_by(Conversation.memory_type)
    )
    dist_result = await db.execute(dist_q)
    memory_distribution = {row[0]: row[1] for row in dist_result.all()}

    return {
        "total_conversations": total_conversations,
        "active_conversations": active_conversations,
        "total_messages": total_messages,
        "total_entities": total_entities,
        "total_triples": total_triples,
        "total_summaries": total_summaries,
        "total_tokens_used": total_tokens,
        "memory_type_distribution": memory_distribution,
    }
