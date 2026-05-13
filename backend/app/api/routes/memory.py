"""Memory inspection routes — view entities, triples, summaries, and token usage."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.entity import Entity
from app.models.entity_version import EntityVersion
from app.models.kg_triple import KGTriple
from app.models.conversation_summary import ConversationSummary
from app.models.token_usage import TokenUsageLog
from app.schemas.memory import (
    EntityOut, EntityVersionOut, KGTripleOut, SummaryOut, TokenUsageOut, MemoryStateOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Memory"])


async def _verify_ownership(
    db: AsyncSession, conversation_id: str, user_id: str
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/{conversation_id}/entities", response_model=list[EntityOut])
async def get_entities(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ownership(db, conversation_id, current_user.id)
    result = await db.execute(
        select(Entity)
        .where(Entity.conversation_id == conversation_id)
        .order_by(Entity.last_updated.desc())
    )
    return list(result.scalars().all())


@router.get("/{conversation_id}/entities/{entity_id}/versions", response_model=list[EntityVersionOut])
async def get_entity_versions(
    conversation_id: str,
    entity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ownership(db, conversation_id, current_user.id)
    result = await db.execute(
        select(EntityVersion)
        .where(EntityVersion.entity_id == entity_id)
        .order_by(EntityVersion.version.asc())
    )
    return list(result.scalars().all())


@router.get("/{conversation_id}/graph", response_model=list[KGTripleOut])
async def get_knowledge_graph(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ownership(db, conversation_id, current_user.id)
    result = await db.execute(
        select(KGTriple)
        .where(KGTriple.conversation_id == conversation_id)
        .order_by(KGTriple.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{conversation_id}/summary", response_model=SummaryOut | None)
async def get_summary(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ownership(db, conversation_id, current_user.id)
    result = await db.execute(
        select(ConversationSummary)
        .where(ConversationSummary.conversation_id == conversation_id)
        .order_by(ConversationSummary.version.desc())
        .limit(1)
    )
    summary = result.scalar_one_or_none()
    if summary is None:
        return None
    return summary


@router.get("/{conversation_id}/tokens", response_model=TokenUsageOut | None)
async def get_token_usage(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ownership(db, conversation_id, current_user.id)
    result = await db.execute(
        select(TokenUsageLog)
        .where(TokenUsageLog.conversation_id == conversation_id)
        .order_by(TokenUsageLog.created_at.desc())
        .limit(1)
    )
    log = result.scalar_one_or_none()
    if log is None:
        return None
    return log


@router.get("/{conversation_id}/memory", response_model=MemoryStateOut)
async def get_memory_state(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full memory state view — entities, triples, summary, tokens."""
    conv = await _verify_ownership(db, conversation_id, current_user.id)

    # entities
    e_result = await db.execute(
        select(Entity)
        .where(Entity.conversation_id == conversation_id)
        .order_by(Entity.last_updated.desc())
    )
    entities = list(e_result.scalars().all())

    # triples
    t_result = await db.execute(
        select(KGTriple)
        .where(KGTriple.conversation_id == conversation_id)
        .order_by(KGTriple.created_at.desc())
    )
    triples = list(t_result.scalars().all())

    # latest summary
    s_result = await db.execute(
        select(ConversationSummary)
        .where(ConversationSummary.conversation_id == conversation_id)
        .order_by(ConversationSummary.version.desc())
        .limit(1)
    )
    summary = s_result.scalar_one_or_none()

    # latest token usage
    tu_result = await db.execute(
        select(TokenUsageLog)
        .where(TokenUsageLog.conversation_id == conversation_id)
        .order_by(TokenUsageLog.created_at.desc())
        .limit(1)
    )
    token_usage = tu_result.scalar_one_or_none()

    return MemoryStateOut(
        memory_type=conv.memory_type,
        entities=entities,
        triples=triples,
        summary=summary,
        token_usage=token_usage,
    )


# --- Global entity search (across all conversations for the user) ---

entity_search_router = APIRouter(prefix="/entities", tags=["Memory"])


@entity_search_router.get("/search", response_model=list[EntityOut])
async def search_entities(
    q: str = "",
    entity_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search entities across all of the user's conversations."""
    query = (
        select(Entity)
        .join(Conversation, Entity.conversation_id == Conversation.id)
        .where(Conversation.user_id == current_user.id)
    )

    if q:
        query = query.where(Entity.name.ilike(f"%{q}%"))

    if entity_type:
        query = query.where(Entity.entity_type == entity_type)

    query = query.order_by(Entity.last_updated.desc()).limit(50)

    result = await db.execute(query)
    return list(result.scalars().all())

