import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from agents.agent_utils import extract_json, PlanState
import agents.agent_utils as agent_utils

# from agents.goal_agent import run_goal_formulator
# from agents.milestone_agent import run_milestone_formulator
from agents.strategic_coach_agent import run_strategic_coach
from agents.technical_translator_agent import run_technical_translator
from agents.motivator_agent import run_resilience_coach
from agents.orchestrator_agent import run_orchestrator

# --- Routing Functions ---


def route_from_orchestrator(state: PlanState):
    stage = state.get("stage", agent_utils.ORCHESTRATOR)
    # If the next stage is still orchestrator, stop and wait for user
    if stage == agent_utils.ORCHESTRATOR:
        return END
    return stage


# def route_from_goal_formulator(state: PlanState):
#     stage = state.get("stage", END)
#     # If the next stage is still goal_formulator, stop and wait for user
#     if stage == agent_utils.GOAL_FORMULATOR:
#         return END
#     return stage


# def route_from_milestone_formulator(state: PlanState):
#     stage = state.get("stage", END)
#     # If the next stage is still milestone_formulator, stop and wait for user
#     if stage == agent_utils.MILESTONE_FORMULATOR:
#         return END
#     return stage


def route_from_strategic_coach(state: PlanState):
    stage = state.get("stage", END)
    # If the next stage is still strategic_coach, stop and wait for user
    if stage == agent_utils.STRATEGIC_COACH:
        return END
    return stage


def route_from_tecnical_translator(state: PlanState):
    stage = state.get("stage", END)

    return stage


def route_from_motivator(state: PlanState):
    stage = state.get("stage", END)
    # If the next stage is still resilience_coach (motivator), stop and wait for user
    if stage == agent_utils.RESILIENCE_COACH:
        return END
    return stage


def entry_gate(state: PlanState):
    return state.get("stage", agent_utils.ORCHESTRATOR)


# --- 3. The Factory Function ---
def build_goal_app(checkpointer):
    """
    Constructs and compiles the graph with a specific checkpointer.
    Returns the runnable 'app'.
    """
    workflow = StateGraph(PlanState)

    # Node Definitions
    workflow.add_node(agent_utils.STRATEGIC_COACH, run_strategic_coach)
    workflow.add_node(agent_utils.TECHNICAL_TRANSLATOR, run_technical_translator)
    # workflow.add_node(agent_utils.GOAL_FORMULATOR, run_goal_formulator)
    # workflow.add_node(agent_utils.MILESTONE_FORMULATOR, run_milestone_formulator)
    workflow.add_node(agent_utils.RESILIENCE_COACH, run_resilience_coach)
    workflow.add_node(agent_utils.ORCHESTRATOR, run_orchestrator)

    # Entry Point
    workflow.set_conditional_entry_point(
        entry_gate,
        {
            # agent_utils.MILESTONE_FORMULATOR: agent_utils.MILESTONE_FORMULATOR,
            # agent_utils.GOAL_FORMULATOR: agent_utils.GOAL_FORMULATOR,
            agent_utils.ORCHESTRATOR: agent_utils.ORCHESTRATOR,
            agent_utils.RESILIENCE_COACH: agent_utils.RESILIENCE_COACH,
            agent_utils.TECHNICAL_TRANSLATOR: agent_utils.TECHNICAL_TRANSLATOR,
            agent_utils.STRATEGIC_COACH: agent_utils.STRATEGIC_COACH,
        },
    )

    # Edges - Using Constants for both Node Keys and Target Mapping
    workflow.add_conditional_edges(
        agent_utils.ORCHESTRATOR,
        route_from_orchestrator,
        {
            END: END,
            agent_utils.STRATEGIC_COACH: agent_utils.STRATEGIC_COACH,
            agent_utils.TECHNICAL_TRANSLATOR: agent_utils.TECHNICAL_TRANSLATOR,
            # agent_utils.GOAL_FORMULATOR: agent_utils.GOAL_FORMULATOR,
            # agent_utils.MILESTONE_FORMULATOR: agent_utils.MILESTONE_FORMULATOR,
            agent_utils.RESILIENCE_COACH: agent_utils.RESILIENCE_COACH,
            # agent_utils.PLANNER: agent_utils.PLANNER,
        },
    )

    # workflow.add_conditional_edges(
    #     agent_utils.GOAL_FORMULATOR,
    #     route_from_goal_formulator,
    #     {
    #         END: END,
    #         agent_utils.MILESTONE_FORMULATOR: agent_utils.MILESTONE_FORMULATOR,
    #     },
    # )

    # workflow.add_conditional_edges(
    #     agent_utils.MILESTONE_FORMULATOR,
    #     route_from_milestone_formulator,
    #     {
    #         END: END,
    #         agent_utils.ORCHESTRATOR: agent_utils.ORCHESTRATOR,
    #     },
    # )

    workflow.add_conditional_edges(
        agent_utils.STRATEGIC_COACH,
        route_from_strategic_coach,
        {
            END: END,
            agent_utils.TECHNICAL_TRANSLATOR: agent_utils.TECHNICAL_TRANSLATOR,
            agent_utils.ORCHESTRATOR: agent_utils.ORCHESTRATOR,
        },
    )

    workflow.add_conditional_edges(
        agent_utils.TECHNICAL_TRANSLATOR,
        route_from_tecnical_translator,
        {
            END: END,
            agent_utils.ORCHESTRATOR: agent_utils.ORCHESTRATOR,
            agent_utils.RESILIENCE_COACH: agent_utils.RESILIENCE_COACH,
        },
    )

    workflow.add_conditional_edges(
        agent_utils.RESILIENCE_COACH,
        route_from_motivator,
        {
            END: END,
            agent_utils.ORCHESTRATOR: agent_utils.ORCHESTRATOR,
        },
    )

    return workflow.compile(checkpointer=checkpointer)
