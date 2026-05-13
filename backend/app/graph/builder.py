"""LangGraph builder — compiles the nodes into an executable state machine.

This module wires together all the isolated nodes using conditional edges
and parallel execution paths.
"""
import logging
from functools import partial

from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, START, END

from app.graph.state import ConversationState
from app.graph.nodes.load_state import load_state
from app.graph.nodes.classify_intent import classify_intent
from app.graph.nodes.build_context import build_context
from app.graph.nodes.generate_response import generate_response
from app.graph.nodes.persist_message import persist_message
from app.graph.nodes.update_summary import update_summary
from app.graph.nodes.update_entities import update_entities
from app.graph.nodes.update_kg import update_kg
from app.graph.nodes.refine_response import refine_response

logger = logging.getLogger(__name__)


def route_memory_updates(state: ConversationState):
    """Determine which memory update nodes to run in parallel."""
    memory_type = state.get("memory_type", "buffer")

    routes = []
    if memory_type in ("summary", "hybrid"):
        routes.append("update_summary")
    if memory_type in ("entity", "hybrid"):
        routes.append("update_entities")
    if memory_type == "kg":
        routes.append("update_kg")

    if not routes:
        # buffer memory has no updates, skip directly to refine_response
        return ["refine_response"]

    return routes


def build_conversation_graph(db: AsyncSession):
    """Compile the conversational state machine for a specific request/db session."""
    workflow = StateGraph(ConversationState)

    # 1. Add all nodes, binding the db session to those that need it
    workflow.add_node("load_state", partial(load_state, db=db))
    workflow.add_node("classify_intent", classify_intent)
    workflow.add_node("build_context", build_context)
    workflow.add_node("generate_response", generate_response)
    workflow.add_node("persist_message", partial(persist_message, db=db))

    # memory nodes (will run in parallel)
    workflow.add_node("update_summary", partial(update_summary, db=db))
    workflow.add_node("update_entities", partial(update_entities, db=db))
    workflow.add_node("update_kg", partial(update_kg, db=db))

    workflow.add_node("refine_response", partial(refine_response, db=db))

    # 2. Define the standard sequential flow
    workflow.add_edge(START, "load_state")
    workflow.add_edge("load_state", "classify_intent")
    workflow.add_edge("classify_intent", "build_context")
    workflow.add_edge("build_context", "generate_response")
    workflow.add_edge("generate_response", "persist_message")

    # 3. Define sequential memory updates (Avoiding session concurrency issues)
    workflow.add_edge("persist_message", "update_summary")
    workflow.add_edge("update_summary", "update_entities")
    workflow.add_edge("update_entities", "update_kg")
    workflow.add_edge("update_kg", "refine_response")

    # 4. Define refinement loop
    workflow.add_edge("refine_response", END)

    # Compile the graph
    return workflow.compile()
