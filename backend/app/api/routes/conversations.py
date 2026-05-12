import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationOut,
    ConversationDetail,
)
from app.schemas.common import SuccessResponse, PaginatedResponse, PaginationMeta
from app.services import conversation_service
from app.services import persona_service
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("/", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # if a persona was specified, verify it exists and bump its usage
    if body.persona_id:
        persona = await persona_service.get_persona(db, body.persona_id)
        if persona is None:
            raise HTTPException(status_code=404, detail="Persona not found")
        await persona_service.increment_usage(db, persona.id)

    conv = await conversation_service.create_conversation(
        db,
        user_id=current_user.id,
        title=body.title,
        persona_id=body.persona_id,
        memory_type=body.memory_type,
        memory_config=body.memory_config,
    )
    return conv


@router.get("/", response_model=PaginatedResponse)
async def list_conversations(
    search: str = Query(default=None, max_length=200),
    pinned: bool = Query(default=False),
    archived: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversations, total = await conversation_service.list_conversations(
        db,
        user_id=current_user.id,
        search=search,
        pinned_only=pinned,
        archived=archived,
        page=page,
        per_page=per_page,
    )

    return PaginatedResponse(
        data=[ConversationOut.model_validate(c).model_dump() for c in conversations],
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            pages=math.ceil(total / per_page) if total else 0,
        ),
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await conversation_service.get_conversation_detail(
        db, conversation_id, current_user.id
    )
    if detail is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail


@router.put("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await conversation_service.update_conversation(
        db,
        conversation_id,
        current_user.id,
        **body.model_dump(exclude_none=True),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return updated


@router.delete("/{conversation_id}", response_model=SuccessResponse)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await conversation_service.delete_conversation(
        db, conversation_id, current_user.id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return SuccessResponse(message="Conversation deleted")
