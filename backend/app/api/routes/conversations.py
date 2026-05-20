import math
import json
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.dependencies import get_db, get_current_user
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationOut,
    ConversationDetail,
)
from app.schemas.message import MessageCreate, MessageOut
from app.schemas.common import SuccessResponse, PaginatedResponse, PaginationMeta
from app.services import conversation_service
from app.services import persona_service
from app.services import message_service
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("/", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.persona_id:
        persona = await persona_service.get_persona_for_user(db, body.persona_id, current_user.id)
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
    search: str | None = Query(default=None, max_length=200),
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


# ---------- Phase 2: Message Endpoints ----------


@router.post("/{conversation_id}/message", response_model=MessageOut)
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _response_text, assistant_message_id = await message_service.send_message(
            db, conversation_id, current_user.id, body.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    from app.models.message import Message

    msg = None
    if assistant_message_id:
        result = await db.execute(
            select(Message).where(Message.id == assistant_message_id)
        )
        msg = result.scalar_one_or_none()

    if msg is None:
        result = await db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.role == "assistant",
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        msg = result.scalar_one_or_none()

    if msg is None:
        raise HTTPException(status_code=500, detail="Assistant response could not be persisted")
    return msg


@router.post("/{conversation_id}/stream")
async def stream_message(
    conversation_id: str,
    body: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    async def event_generator():
        try:
            async for chunk in message_service.stream_message(
                db, conversation_id, current_user.id, body.content,
            ):
                if await request.is_disconnected():
                    break
                yield {"event": "token", "data": chunk}

            yield {"event": "done", "data": "[DONE]"}

        except ValueError as exc:
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}
        except RuntimeError as exc:
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}
        except Exception as exc:
            logger.error("Stream error: %s", exc)
            yield {"event": "error", "data": json.dumps({"detail": "Internal server error"})}

    return EventSourceResponse(event_generator())


# ---------- Phase 3: Export Endpoint ----------


@router.get("/{conversation_id}/export")
@router.post("/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    format: Literal["json", "markdown"] = "json",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services import export_service

    conv = await conversation_service.get_conversation(
        db, conversation_id, current_user.id
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if format == "markdown":
        md_content = await export_service.export_to_markdown(db, conversation_id)
        return PlainTextResponse(md_content)

    return await export_service.get_conversation_data(db, conversation_id)


@router.post("/import", response_model=ConversationOut)
async def import_conversation(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services import import_service
    try:
        from app.models.conversation import Conversation

        new_id = await import_service.import_conversation(db, current_user.id, body)
        await db.flush()

        result = await db.execute(
            select(Conversation).where(Conversation.id == new_id)
        )
        return result.scalar_one()
    except Exception as e:
        logger.error("Import failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
