import json
import logging
from pathlib import Path
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.persona import Persona

logger = logging.getLogger(__name__)

PERSONAS_FILE = Path(__file__).resolve().parent.parent / "data" / "personas.json"


async def seed_builtin_personas(db: AsyncSession) -> None:
    """Load built-in personas from JSON if they haven't been created yet."""
    existing = await db.execute(
        select(func.count()).where(Persona.is_builtin == True)  # noqa: E712
    )
    count = existing.scalar() or 0

    if count > 0:
        logger.debug("Built-in personas already seeded (%d found), skipping", count)
        return

    if not PERSONAS_FILE.exists():
        logger.warning("Personas file not found at %s", PERSONAS_FILE)
        return

    with open(PERSONAS_FILE, "r", encoding="utf-8") as fh:
        personas_data = json.load(fh)

    for entry in personas_data:
        persona = Persona(
            name=entry["name"],
            avatar_url=entry.get("avatar_url"),
            system_prompt=entry["system_prompt"],
            personality=entry.get("personality", ""),
            domain=entry.get("domain", "general"),
            default_memory=entry.get("default_memory", "buffer"),
            temperature=entry.get("temperature", 0.7),
            is_builtin=True,
            creator_id=None,
        )
        db.add(persona)

    await db.flush()
    logger.info("Seeded %d built-in personas", len(personas_data))


async def list_personas(
    db: AsyncSession,
    user_id: Optional[str] = None,
) -> list[Persona]:
    """Return all built-in personas plus the user's custom ones."""
    query = select(Persona)
    if user_id:
        query = query.where(
            (Persona.is_builtin == True) | (Persona.creator_id == user_id)  # noqa: E712
        )
    else:
        query = query.where(Persona.is_builtin == True)  # noqa: E712

    query = query.order_by(Persona.is_builtin.desc(), Persona.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_persona(db: AsyncSession, persona_id: str) -> Optional[Persona]:
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    return result.scalar_one_or_none()


async def get_persona_for_user(
    db: AsyncSession,
    persona_id: str,
    user_id: str,
) -> Optional[Persona]:
    result = await db.execute(
        select(Persona).where(
            Persona.id == persona_id,
            ((Persona.is_builtin == True) | (Persona.creator_id == user_id)),  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create_persona(
    db: AsyncSession,
    user_id: str,
    **fields,
) -> Persona:
    persona = Persona(creator_id=user_id, is_builtin=False, **fields)
    db.add(persona)
    await db.flush()
    logger.info("User %s created persona '%s'", user_id, persona.name)
    return persona


async def update_persona(
    db: AsyncSession,
    persona_id: str,
    user_id: str,
    **fields,
) -> Optional[Persona]:
    persona = await get_persona(db, persona_id)
    if persona is None:
        return None

    # only the creator can edit, and built-in personas are read-only
    if persona.is_builtin:
        raise ValueError("Built-in personas cannot be modified")
    if persona.creator_id != user_id:
        raise PermissionError("You can only edit your own personas")

    for key, value in fields.items():
        if value is not None and hasattr(persona, key):
            setattr(persona, key, value)

    await db.flush()
    return persona


async def delete_persona(
    db: AsyncSession,
    persona_id: str,
    user_id: str,
) -> bool:
    persona = await get_persona(db, persona_id)
    if persona is None:
        return False

    if persona.is_builtin:
        raise ValueError("Built-in personas cannot be deleted")
    if persona.creator_id != user_id:
        raise PermissionError("You can only delete your own personas")

    await db.delete(persona)
    await db.flush()
    logger.info("Deleted persona %s", persona_id)
    return True


async def increment_usage(db: AsyncSession, persona_id: str) -> None:
    """Bump the usage counter when a conversation uses this persona."""
    persona = await get_persona(db, persona_id)
    if persona:
        persona.usage_count += 1
        await db.flush()
