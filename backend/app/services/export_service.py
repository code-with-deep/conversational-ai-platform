import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.conversation_summary import ConversationSummary
from app.models.entity import Entity
from app.models.entity_version import EntityVersion
from app.models.kg_triple import KGTriple
from app.models.message import Message

logger = logging.getLogger(__name__)


async def get_conversation_data(db: AsyncSession, conversation_id: str) -> dict[str, Any]:
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return {}

    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = [
        {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "token_count": message.token_count,
            "metadata": message.metadata_,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
        for message in msg_result.scalars().all()
    ]

    version_result = await db.execute(
        select(EntityVersion).join(Entity, EntityVersion.entity_id == Entity.id).where(
            Entity.conversation_id == conversation_id
        )
    )
    versions_by_entity: dict[str, list[dict[str, Any]]] = {}
    for version in version_result.scalars().all():
        versions_by_entity.setdefault(version.entity_id, []).append(
            {
                "id": version.id,
                "description": version.description,
                "version": version.version,
                "source_message_id": version.source_message_id,
                "created_at": version.created_at.isoformat() if version.created_at else None,
            }
        )

    ent_result = await db.execute(
        select(Entity).where(Entity.conversation_id == conversation_id)
    )
    entities = [
        {
            "name": entity.name,
            "entity_type": entity.entity_type,
            "description": entity.description,
            "mention_count": entity.mention_count,
            "is_global": entity.is_global,
            "first_seen": entity.first_seen.isoformat() if entity.first_seen else None,
            "last_updated": entity.last_updated.isoformat() if entity.last_updated else None,
            "versions": versions_by_entity.get(entity.id, []),
        }
        for entity in ent_result.scalars().all()
    ]

    tri_result = await db.execute(
        select(KGTriple).where(KGTriple.conversation_id == conversation_id)
    )
    triples = [
        {
            "subject": triple.subject,
            "predicate": triple.predicate,
            "object": triple.object_,
            "confidence": triple.confidence,
            "source_message_id": triple.source_message_id,
            "created_at": triple.created_at.isoformat() if triple.created_at else None,
        }
        for triple in tri_result.scalars().all()
    ]

    sum_result = await db.execute(
        select(ConversationSummary)
        .where(ConversationSummary.conversation_id == conversation_id)
        .order_by(ConversationSummary.version.asc())
    )
    summaries = [
        {
            "summary_text": summary.summary_text,
            "messages_covered": summary.messages_covered,
            "token_count": summary.token_count,
            "version": summary.version,
            "created_at": summary.created_at.isoformat() if summary.created_at else None,
        }
        for summary in sum_result.scalars().all()
    ]

    return {
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "persona_id": conv.persona_id,
            "memory_type": conv.memory_type,
            "memory_config": conv.memory_config,
            "message_count": conv.message_count,
            "total_tokens_used": conv.total_tokens_used,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        },
        "messages": messages,
        "entities": entities,
        "triples": triples,
        "summaries": summaries,
    }


async def export_to_markdown(db: AsyncSession, conversation_id: str) -> str:
    data = await get_conversation_data(db, conversation_id)
    if not data:
        return "# Conversation not found"

    conv = data["conversation"]
    markdown = [
        f"# {conv['title']}",
        f"**Date:** {conv['created_at']}",
        f"**Memory Strategy:** {conv['memory_type']}",
        f"**Total Tokens:** {conv['total_tokens_used']}",
        "",
        "## Conversation History",
        "",
    ]

    for message in data["messages"]:
        markdown.append(f"### {message['role'].capitalize()}")
        markdown.append(message["content"])
        markdown.append("")

    if data["summaries"]:
        markdown.extend(["---", "## Memory Summaries", ""])
        for summary in data["summaries"]:
            markdown.append(
                f"### Version {summary['version']} (covering {summary['messages_covered']} messages)"
            )
            markdown.append(summary["summary_text"])
            markdown.append("")

    if data["entities"]:
        markdown.extend(["---", "## Extracted Entities", ""])
        for entity in data["entities"]:
            markdown.append(
                f"- **{entity['name']}** ({entity['entity_type']}): {entity['description']} "
                f"(Mentions: {entity['mention_count']})"
            )
        markdown.append("")

    if data["triples"]:
        markdown.extend(["---", "## Knowledge Graph (Triples)", ""])
        for triple in data["triples"]:
            markdown.append(
                f"- {triple['subject']} --[{triple['predicate']}]--> {triple['object']}"
            )
        markdown.append("")

    return "\n".join(markdown)
