import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.conversation_summary import ConversationSummary
from app.models.entity import Entity
from app.models.entity_version import EntityVersion
from app.models.kg_triple import KGTriple
from app.models.message import Message
from app.models.persona import Persona

logger = logging.getLogger(__name__)


def _parse_datetime(value: Any):
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


async def import_conversation(
    db: AsyncSession,
    user_id: str,
    export_data: dict[str, Any],
) -> str:
    conv_data = export_data.get("conversation", {})
    new_conv_id = str(uuid.uuid4())

    persona_id = conv_data.get("persona_id")
    if persona_id:
        persona_result = await db.execute(select(Persona).where(Persona.id == persona_id))
        if persona_result.scalar_one_or_none() is None:
            persona_id = None

    conversation = Conversation(
        id=new_conv_id,
        user_id=user_id,
        persona_id=persona_id,
        title=f"Imported: {conv_data.get('title', 'Unknown')}",
        memory_type=conv_data.get("memory_type", "buffer"),
        memory_config=conv_data.get("memory_config", {}),
        message_count=conv_data.get("message_count", 0),
        total_tokens_used=conv_data.get("total_tokens_used", 0),
        created_at=_parse_datetime(conv_data.get("created_at")) or Conversation.created_at.default.arg(),
        updated_at=_parse_datetime(conv_data.get("updated_at")) or Conversation.updated_at.default.arg(),
    )
    db.add(conversation)
    await db.flush()

    message_map: dict[str, str] = {}
    for message_data in export_data.get("messages", []):
        old_id = message_data.get("id")
        new_message = Message(
            conversation_id=new_conv_id,
            role=message_data.get("role"),
            content=message_data.get("content"),
            token_count=message_data.get("token_count", 0),
            metadata_=message_data.get("metadata", {}),
            created_at=_parse_datetime(message_data.get("created_at")) or Message.created_at.default.arg(),
        )
        db.add(new_message)
        await db.flush()
        if old_id:
            message_map[old_id] = new_message.id

    for entity_data in export_data.get("entities", []):
        entity = Entity(
            conversation_id=new_conv_id,
            user_id=user_id,
            name=entity_data.get("name"),
            entity_type=entity_data.get("entity_type"),
            description=entity_data.get("description"),
            mention_count=entity_data.get("mention_count", 1),
            is_global=entity_data.get("is_global", False),
            first_seen=_parse_datetime(entity_data.get("first_seen")) or Entity.first_seen.default.arg(),
            last_updated=_parse_datetime(entity_data.get("last_updated")) or Entity.last_updated.default.arg(),
        )
        db.add(entity)
        await db.flush()

        for version_data in entity_data.get("versions", []):
            version = EntityVersion(
                entity_id=entity.id,
                source_message_id=message_map.get(version_data.get("source_message_id")),
                description=version_data.get("description"),
                version=version_data.get("version", 1),
                created_at=_parse_datetime(version_data.get("created_at")) or EntityVersion.created_at.default.arg(),
            )
            db.add(version)

    for triple_data in export_data.get("triples", []):
        triple = KGTriple(
            conversation_id=new_conv_id,
            user_id=user_id,
            subject=triple_data.get("subject"),
            predicate=triple_data.get("predicate"),
            object_=triple_data.get("object") or triple_data.get("object_"),
            confidence=triple_data.get("confidence", 1.0),
            source_message_id=message_map.get(triple_data.get("source_message_id")),
            created_at=_parse_datetime(triple_data.get("created_at")) or KGTriple.created_at.default.arg(),
        )
        db.add(triple)

    summaries_data = export_data.get("summaries", [])
    if not summaries_data:
        legacy_summary = export_data.get("summary")
        if isinstance(legacy_summary, dict):
            summaries_data = [legacy_summary]

    for summary_data in summaries_data:
        summary = ConversationSummary(
            conversation_id=new_conv_id,
            summary_text=summary_data.get("summary_text"),
            messages_covered=summary_data.get("messages_covered", 0),
            token_count=summary_data.get("token_count", 0),
            version=summary_data.get("version", 1),
            created_at=_parse_datetime(summary_data.get("created_at")) or ConversationSummary.created_at.default.arg(),
        )
        db.add(summary)

    await db.flush()
    logger.info(
        "Imported conversation %s as %s for user %s",
        conv_data.get("id"),
        new_conv_id,
        user_id,
    )
    return new_conv_id
