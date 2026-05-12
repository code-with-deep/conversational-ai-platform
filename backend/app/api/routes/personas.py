from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaOut
from app.schemas.common import SuccessResponse
from app.services import persona_service
from app.models.user import User

router = APIRouter(prefix="/personas", tags=["Personas"])


@router.get("/", response_model=list[PersonaOut])
async def list_personas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    personas = await persona_service.list_personas(db, user_id=current_user.id)
    return personas


@router.post("/", response_model=PersonaOut, status_code=status.HTTP_201_CREATED)
async def create_persona(
    body: PersonaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    persona = await persona_service.create_persona(
        db,
        user_id=current_user.id,
        **body.model_dump(),
    )
    return persona


@router.get("/{persona_id}", response_model=PersonaOut)
async def get_persona(
    persona_id: str,
    db: AsyncSession = Depends(get_db),
):
    persona = await persona_service.get_persona(db, persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.put("/{persona_id}", response_model=PersonaOut)
async def update_persona(
    persona_id: str,
    body: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        persona = await persona_service.update_persona(
            db, persona_id, current_user.id, **body.model_dump(exclude_none=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    if persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.delete("/{persona_id}", response_model=SuccessResponse)
async def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        deleted = await persona_service.delete_persona(db, persona_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    if not deleted:
        raise HTTPException(status_code=404, detail="Persona not found")
    return SuccessResponse(message="Persona deleted")
