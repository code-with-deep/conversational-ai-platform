"""Import service — recreates a conversation state from a JSON export."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.entity import Entity
from app.models.entity_version import EntityVersion
from app.models.kg_triple import KGTriple
from app.models.conversation_summary import ConversationSummary

logger = logging.getLogger(__name__)

async def import_conversation(
    db: AsyncSession,
    user_id: str,
    export_data: dict[str, Any]
) -> str:
    """Reconstruct a full conversation from export data.
    
    Returns the new conversation_id.
    """
    # 1. Create the conversation record
    conv_data = export_data.get("conversation", {})
    new_conv_id = str(uuid.uuid4())
    
    conversation = Conversation(
        id=new_conv_id,
        user_id=user_id,
        persona_id=conv_data.get("persona_id"),
        title=f"Imported: {conv_data.get('title', 'Unknown')}",
        memory_type=conv_data.get("memory_type", "buffer"),
        memory_config=conv_data.get("memory_config", {}),
        message_count=conv_data.get("message_count", 0),
        total_tokens_used=conv_data.get("total_tokens_used", 0),
    )
    db.add(conversation)
    await db.flush()

    # 2. Import Messages
    message_map = {} # old_id -> new_id
    messages = export_data.get("messages", [])
    for msg_data in messages:
        old_id = msg_data.get("id")
        new_msg = Message(
            conversation_id=new_conv_id,
            role=msg_data.get("role"),
            content=msg_data.get("content"),
            token_count=msg_data.get("token_count", 0),
            metadata=msg_data.get("metadata", {}),
        )
        db.add(new_msg)
        await db.flush()
        message_map[old_id] = new_msg.id

    # 3. Import Entities
    entities = export_data.get("entities", [])
    for ent_data in entities:
        new_entity = Entity(
            conversation_id=new_conv_id,
            user_id=user_id,
            name=ent_data.get("name"),
            entity_type=ent_data.get("entity_type"),
            description=ent_data.get("description"),
            mention_count=ent_data.get("mention_count", 1),
            is_global=ent_data.get("is_global", False),
        )
        db.add(new_entity)
        await db.flush()
        
        # import versions if present
        versions = ent_data.get("versions", [])
        for v_data in versions:
            source_id = message_map.get(v_data.get("source_message_id"))
            version = EntityVersion(
                entity_id=new_entity.id,
                source_message_id=source_id,
                description=v_data.get("description"),
                version=v_data.get("version", 1),
            )
            db.add(version)

    # 4. Import KG Triples
    triples = export_data.get("triples", [])
    for t_data in triples:
        source_id = message_map.get(t_data.get("source_message_id"))
        triple = KGTriple(
            conversation_id=new_conv_id,
            user_id=user_id,
            subject=t_data.get("subject"),
            predicate=t_data.get("predicate"),
            object_=t_data.get("object") or t_data.get("object_"),
            confidence=t_data.get("confidence", 1.0),
            source_message_id=source_id,
        )
        db.add(triple)

    # 5. Import Summary
    summary_data = export_data.get("summary")
    if summary_data:
        summary = ConversationSummary(
            conversation_id=new_conv_id,
            summary_text=summary_data.get("summary_text"),
            messages_covered=summary_data.get("messages_covered", 0),
            token_count=summary_data.get("token_count", 0),
            version=summary_data.get("version", 1),
        )
        db.add(summary)

    await db.flush()
    logger.info("Imported conversation %s (new_id: %s) for user %s", 
                conv_data.get("id"), new_conv_id, user_id)
    return new_conv_id
