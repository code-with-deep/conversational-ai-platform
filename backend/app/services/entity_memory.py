"""Entity memory — extracts and tracks named entities (people, projects, etc.)

After each exchange, the LLM identifies entities mentioned and upserts
them into the database. The memory context includes a "fact sheet" of
all known entities for this conversation.
"""
import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.entity_version import EntityVersion
from app.models.message import Message
from app.models.conversation import Conversation
from app.services import llm_client
from app.services.buffer_memory import get_recent_messages  # re-export for strategy interface

logger = logging.getLogger(__name__)

EXTRACT_PROMPT = """Analyze the following conversation exchange and extract any named entities.

For each entity found, provide:
- name: the entity name (e.g. "John", "Project Alpha", "Python")
- type: one of person, organization, project, technology, date, concept, other
- description: a brief factual description based on what was said

Return a JSON array. If no entities are found, return an empty array [].

Example output:
[
  {{"name": "Sarah", "type": "person", "description": "The user's manager who approved the budget"}},
  {{"name": "Project Falcon", "type": "project", "description": "A machine learning pipeline being built in Python"}}
]

Conversation exchange:
User: {user_message}
Assistant: {assistant_message}

JSON array:"""


async def get_memory_context(
    db: AsyncSession,
    conversation_id: str,
) -> str:
    """Build a fact sheet from all tracked entities."""
    result = await db.execute(
        select(Entity)
        .where(Entity.conversation_id == conversation_id)
        .order_by(Entity.last_updated.desc())
    )
    entities = result.scalars().all()

    if not entities:
        return ""

    lines = ["Known entities from this conversation:"]
    for e in entities:
        lines.append(f"- {e.name} ({e.entity_type}): {e.description}")

    return "\n".join(lines)


async def get_entities(
    db: AsyncSession,
    conversation_id: str,
) -> list[Entity]:
    """Return all entities for a conversation."""
    result = await db.execute(
        select(Entity)
        .where(Entity.conversation_id == conversation_id)
        .order_by(Entity.last_updated.desc())
    )
    return list(result.scalars().all())


async def update_memory(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """Extract entities from the latest exchange and upsert them."""
    # get the conversation's user_id
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return

    prompt = EXTRACT_PROMPT.format(
        user_message=user_message,
        assistant_message=assistant_message,
    )

    raw_response = await llm_client.generate_response(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
    )

    # parse the JSON response
    try:
        # find the JSON array block
        start_idx = raw_response.find("[")
        end_idx = raw_response.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = raw_response[start_idx : end_idx + 1]
            extracted = json.loads(cleaned)
        else:
            raise json.JSONDecodeError("No JSON array found", raw_response, 0)
    except (json.JSONDecodeError, IndexError):
        logger.warning("Failed to parse entity extraction response: %s", raw_response[:200])
        return

    if not isinstance(extracted, list):
        return

    # get the latest message id for sourcing
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    latest_msg = msg_result.scalar_one_or_none()
    source_msg_id = latest_msg.id if latest_msg else None

    for entry in extracted:
        name = entry.get("name", "").strip()
        if not name:
            continue

        entity_type = entry.get("type", "other")
        description = entry.get("description", "")

        # check if this entity already exists
        existing_result = await db.execute(
            select(Entity).where(
                Entity.conversation_id == conversation_id,
                Entity.name == name,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            # update existing entity
            existing.description = description
            existing.mention_count += 1
            existing.entity_type = entity_type

            # save version history
            version = EntityVersion(
                entity_id=existing.id,
                source_message_id=source_msg_id,
                description=description,
                version=existing.mention_count,
            )
            db.add(version)
        else:
            # create new entity
            entity = Entity(
                conversation_id=conversation_id,
                user_id=conv.user_id,
                name=name,
                entity_type=entity_type,
                description=description,
            )
            db.add(entity)
            await db.flush()

            # initial version
            version = EntityVersion(
                entity_id=entity.id,
                source_message_id=source_msg_id,
                description=description,
                version=1,
            )
            db.add(version)

    await db.flush()
    logger.info("Extracted %d entities for conversation %s", len(extracted), conversation_id)
