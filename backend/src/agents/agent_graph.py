import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from agents.agent_utils import extract_json, PlanState
import agents.agent_utils as agent_utils

from agents.goal_planner_agent import run_goal_planner
from agents.goal_validator_agent import run_goal_validator
from agents.user_context_agent import run_user_context_agent
from agents.technical_translator_agent import run_technical_translator


# --- Routing Functions ---
def route_from_user_context_acquirer(state: PlanState):
    stage = END
    if (
        state.get("user_context_num_iterations", 100) >= 2
        or state.get("user_context_status", "INCOMPLETE") == "COMPLETE"
    ):
        stage = agent_utils.GOAL_PLANNER

    return stage


def route_from_planner(state: PlanState):
    stage = agent_utils.TECHNICAL_TRANSLATOR
    if state.get("num_iterations", 100) < 1:
        stage = agent_utils.GOAL_VALIDATOR
    return stage


def route_from_validator(state: PlanState):
    stage = agent_utils.TECHNICAL_TRANSLATOR
    if (
        state.get("num_iterations", 100) <= 1
        and state.get("validation_status", "FAILED") != "PASSED"
    ):
        stage = agent_utils.GOAL_PLANNER
    return stage


def entry_gate(state: PlanState):
    return agent_utils.USER_CONTEXT_ACQUIRER


# --- 3. The Factory Function ---
def build_goal_app(checkpointer):
    """
    Constructs and compiles the graph with a specific checkpointer.
    Returns the runnable 'app'.
    """
    workflow = StateGraph(PlanState)

    # Node Definitions
    workflow.add_node(agent_utils.USER_CONTEXT_ACQUIRER, run_user_context_agent)
    workflow.add_node(agent_utils.GOAL_PLANNER, run_goal_planner)
    workflow.add_node(agent_utils.GOAL_VALIDATOR, run_goal_validator)
    workflow.add_node(agent_utils.TECHNICAL_TRANSLATOR, run_technical_translator)

    # Entry Point
    workflow.set_conditional_entry_point(
        entry_gate,
        {
            agent_utils.USER_CONTEXT_ACQUIRER: agent_utils.USER_CONTEXT_ACQUIRER,
        },
    )

    workflow.add_conditional_edges(
        agent_utils.USER_CONTEXT_ACQUIRER,
        route_from_user_context_acquirer,
        {
            END: END,
            agent_utils.GOAL_PLANNER: agent_utils.GOAL_PLANNER,
        },
    )

    workflow.add_conditional_edges(
        agent_utils.GOAL_PLANNER,
        route_from_planner,
        {
            END: END,
            agent_utils.GOAL_VALIDATOR: agent_utils.GOAL_VALIDATOR,
            agent_utils.TECHNICAL_TRANSLATOR: agent_utils.TECHNICAL_TRANSLATOR,
        },
    )

    workflow.add_conditional_edges(
        agent_utils.GOAL_VALIDATOR,
        route_from_validator,
        {
            END: END,
            agent_utils.GOAL_PLANNER: agent_utils.GOAL_PLANNER,
            agent_utils.TECHNICAL_TRANSLATOR: agent_utils.TECHNICAL_TRANSLATOR,
        },
    )

    workflow.add_edge(agent_utils.TECHNICAL_TRANSLATOR, END)

    return workflow.compile(checkpointer=checkpointer)
