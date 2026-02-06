# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from prompts.prompts import GOAL_FORMULATOR_PROMPT
from agents.agent_utils import extract_json, fill_prompt_template, PlanState
from persistence.tinydb_database import GoalRepository
from schemas.core import Goal, Milestone


def commit_goal(goal: dict, state: PlanState):
    goal_obj = Goal(
        what=goal.get("what"),
        when=goal.get("timeline"),
        why=goal.get("why"),
        user_id=state["user_id"],
    )

    repo = GoalRepository()

    repo.create_goal(goal_obj)

    return goal_obj


def get_initial_context(state: PlanState):

    # Start with the orchestrator prompt
    sys_prompt = fill_prompt_template(GOAL_FORMULATOR_PROMPT, {})

    messages = [
        SystemMessage(content=sys_prompt),
    ]

    return messages


def update_state_on_completion(goal: Goal, state: PlanState):
    # Update the state based on the extracted status

    state["structured_data"]["goal"] = goal
    state["stage"] = "milestone_formulator"
    state["current_context"] = []  # Clear context for next agent

    return state


# --- 4. Node: Goal Architect ---
def run_goal_formulator(state: PlanState):
    this_call_messages = 0
    if not state.get("current_context"):
        state["current_context"] = get_initial_context(state)
        this_call_messages += 1

    state["current_context"].append(state["last_user_message"])
    this_call_messages += 1

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)
    response = llm.invoke(state["current_context"])

    breakpoint()

    state["current_context"].append(response)
    this_call_messages += 1
    state["message_history"] += state["current_context"][-this_call_messages:]

    # Check for signal
    goal = extract_json(response.content)
    if goal:
        goal_obj = commit_goal(goal, state)
        updated_state = update_state_on_completion(goal_obj, state)
        return updated_state

    return state
