# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from agents.agent_utils import extract_json, PlanState
from agents.goal_agent import run_goal_formulator
from agents.motivator_agent import run_motivator
from agents.milestone_agent import run_milestone_formulator
from agents.orchestrator_agent import run_orchestrator


def route_from_orchestrator(state: PlanState):
    if state["stage"] == "goal_formulator":
        return "goal_formulator"
    elif state["stage"] == "motivator":
        return "motivator"

    return END


def route_from_goal_formulator(state: PlanState):
    if state["stage"] == "milestone_formulator":
        return "milestone_formulator"
    return END


def route_from_milestone_formulator(state: PlanState):
    if state["stage"] == "orchestrator":
        return "orchestrator"
    return END


def route_from_motivator(state: PlanState):
    if state["stage"] == "orchestrator":
        return "orchestrator"
    return END


def entry_gate(state: PlanState):
    # breakpoint()
    if state.get("stage") == "orchestrator":
        return "orchestrator"
    elif state.get("stage") == "goal_formulator":
        return "goal_formulator"
    elif state.get("stage") == "milestone_formulator":
        return "milestone_formulator"
    elif state.get("stage") == "motivator":
        return "motivator"
    return "orchestrator"  # Default entry point


# --- 3. The Factory Function ---
def build_goal_app(checkpointer):
    """
    Constructs and compiles the graph with a specific checkpointer.
    Returns the runnable 'app'.
    """
    workflow = StateGraph(PlanState)

    workflow.add_node("goal_formulator", run_goal_formulator)
    workflow.add_node("milestone_formulator", run_milestone_formulator)
    workflow.add_node("motivator", run_motivator)
    workflow.add_node("orchestrator", run_orchestrator)

    workflow.set_conditional_entry_point(
        entry_gate,
        {
            "goal_formulator": "goal_formulator",
            "milestone_formulator": "milestone_formulator",
            "motivator": "motivator",
            "orchestrator": "orchestrator",
        },
    )

    # Edges
    workflow.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            END: END,
            "goal_formulator": "goal_formulator",
            "motivator": "motivator",
        },
    )
    workflow.add_conditional_edges(
        "goal_formulator",
        route_from_goal_formulator,
        {
            END: END,
            "milestone_formulator": "milestone_formulator",
        },
    )
    workflow.add_conditional_edges(
        "milestone_formulator",
        route_from_milestone_formulator,
        {
            END: END,
            "orchestrator": "orchestrator",
        },
    )
    workflow.add_conditional_edges(
        "motivator",
        route_from_motivator,
        {
            END: END,
            "orchestrator": "orchestrator",
        },
    )

    # Compile with the passed checkpointer
    return workflow.compile(checkpointer=checkpointer)
