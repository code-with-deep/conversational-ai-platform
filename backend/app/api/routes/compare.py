"""Comparison API — replay a conversation with a different memory strategy.

Allows users to see how the AI would have responded using a different memory
strategy on the same conversation history.
"""
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.memory_manager import get_strategy
from app.services.context_manager import build_context
from app.services import llm_client
from app.services.token_counter import count_tokens

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compare", tags=["Comparison"])


class CompareRequest(BaseModel):
    conversation_id: str
    strategy_a: Literal["buffer", "summary", "entity", "kg", "hybrid"] = "buffer"
    strategy_b: Literal["buffer", "summary", "entity", "kg", "hybrid"] = "entity"


class StrategyResult(BaseModel):
    strategy: str
    response: str
    token_usage: dict


class CompareResponse(BaseModel):
    conversation_id: str
    user_message: str
    result_a: StrategyResult
    result_b: StrategyResult


async def _simulate_strategy(
    db: AsyncSession,
    conversation_id: str,
    strategy_name: str,
    system_prompt: str,
    temperature: float,
    user_message: str,
) -> StrategyResult:
    """Run a single strategy simulation without persisting anything."""
    strategy = get_strategy(strategy_name)

    # load memory context using the specified strategy
    memory_ctx = await strategy.get_memory_context(db, conversation_id)

    # load recent messages
    if hasattr(strategy, "get_recent_messages"):
        recent = await strategy.get_recent_messages(db, conversation_id)
    else:
        from app.services.buffer_memory import get_recent_messages
        recent = await get_recent_messages(db, conversation_id)

    # append the user message to recent messages for context
    recent_with_user = recent + [{"role": "user", "content": user_message}]

    # build context
    messages, budget = build_context(system_prompt, memory_ctx, recent_with_user)

    # generate response
    response_text = await llm_client.generate_response(messages, temperature=temperature)

    return StrategyResult(
        strategy=strategy_name,
        response=response_text,
        token_usage={
            "system_tokens": budget.system,
            "memory_tokens": budget.memory,
            "recent_tokens": budget.recent,
            "response_tokens": count_tokens(response_text),
            "total_tokens": budget.total + count_tokens(response_text),
            "budget_total": budget.budget_total,
        },
    )


@router.post("/memory", response_model=CompareResponse)
async def compare_memory_strategies(
    body: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare two memory strategies on the same conversation."""
    # verify conversation ownership
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == body.conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # get the last user message as the comparison prompt
    msg_result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == body.conversation_id,
            Message.role == "user",
        )
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_user_msg = msg_result.scalar_one_or_none()
    if last_user_msg is None:
        raise HTTPException(status_code=400, detail="No user messages to compare")

    # load persona prompt
    system_prompt = (
        "You are a helpful AI assistant. You are conversational, clear, "
        "and adapt your tone to the user's needs."
    )
    temperature = 0.7

    if conv.persona_id:
        from app.models.persona import Persona
        p_result = await db.execute(
            select(Persona).where(Persona.id == conv.persona_id)
        )
        persona = p_result.scalar_one_or_none()
        if persona:
            system_prompt = persona.system_prompt
            temperature = persona.temperature

    # run both strategies
    try:
        result_a = await _simulate_strategy(
            db, body.conversation_id, body.strategy_a,
            system_prompt, temperature, last_user_msg.content,
        )
        result_b = await _simulate_strategy(
            db, body.conversation_id, body.strategy_b,
            system_prompt, temperature, last_user_msg.content,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return CompareResponse(
        conversation_id=body.conversation_id,
        user_message=last_user_msg.content,
        result_a=result_a,
        result_b=result_b,
    )
