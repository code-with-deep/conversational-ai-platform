"""Knowledge Graph memory — extracts subject-predicate-object triples.

After each exchange, the LLM identifies relationships and stores them
as (subject, predicate, object) triples. The memory context renders
these as a structured knowledge graph.
"""
import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kg_triple import KGTriple
from app.models.message import Message
from app.models.conversation import Conversation
from app.services import llm_client
from app.services.buffer_memory import get_recent_messages  # re-export for strategy interface

logger = logging.getLogger(__name__)

EXTRACT_PROMPT = """Analyze the following conversation exchange and extract knowledge graph triples.

Each triple should be: (subject, predicate, object)
- Subject: a noun or named entity
- Predicate: the relationship or verb
- Object: another noun, entity, or value

Return a JSON array of objects with "subject", "predicate", and "object" keys.
If no relationships are found, return an empty array [].

Example output:
[
  {{"subject": "Sarah", "predicate": "works at", "object": "Google"}},
  {{"subject": "Project Alpha", "predicate": "uses", "object": "Python"}},
  {{"subject": "The deadline", "predicate": "is", "object": "March 15th"}}
]

Conversation exchange:
User: {user_message}
Assistant: {assistant_message}

JSON array:"""


async def get_memory_context(
    db: AsyncSession,
    conversation_id: str,
) -> str:
    """Build a knowledge graph description from all stored triples."""
    result = await db.execute(
        select(KGTriple)
        .where(KGTriple.conversation_id == conversation_id)
        .order_by(KGTriple.created_at.desc())
    )
    triples = result.scalars().all()

    if not triples:
        return ""

    lines = ["Knowledge graph from this conversation:"]
    for t in triples:
        lines.append(f"- {t.subject} → {t.predicate} → {t.object_}")

    return "\n".join(lines)


async def get_triples(
    db: AsyncSession,
    conversation_id: str,
) -> list[KGTriple]:
    """Return all triples for a conversation."""
    result = await db.execute(
        select(KGTriple)
        .where(KGTriple.conversation_id == conversation_id)
        .order_by(KGTriple.created_at.desc())
    )
    return list(result.scalars().all())


async def update_memory(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """Extract triples from the latest exchange and save them."""
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
        logger.warning("Failed to parse KG extraction response: %s", raw_response[:200])
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

    count = 0
    for entry in extracted:
        subj = entry.get("subject", "").strip()
        pred = entry.get("predicate", "").strip()
        obj = entry.get("object", "").strip()

        if not subj or not pred or not obj:
            continue

        triple = KGTriple(
            conversation_id=conversation_id,
            user_id=conv.user_id,
            subject=subj,
            predicate=pred,
            object_=obj,
            confidence=entry.get("confidence", 1.0),
            source_message_id=source_msg_id,
        )
        db.add(triple)
        count += 1

    await db.flush()
    logger.info("Extracted %d triples for conversation %s", count, conversation_id)
