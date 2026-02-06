# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from prompts.prompts import MOTIVATOR_PROMPT
from agents.agent_utils import extract_json, fill_prompt_template, PlanState
from persistence.tinydb_database import GoalRepository


def get_initial_context(state: PlanState):
    repo = GoalRepository()
    goal_info_results = repo.get_goal_info_for_user(
        state["user_id"], state["structured_data"]["intent"]["goal_id"]
    )
    gir = goal_info_results
    goal_info = {"what": gir["what"], "when": gir["when"], "why": gir["why"]}
    goal_info["milestones"] = [
        dict(statement=m["statement"]) for m in gir.get("milestones", [])
    ]

    # Start with the orchestrator prompt
    sys_prompt = fill_prompt_template(MOTIVATOR_PROMPT, dict(goal_info=goal_info))

    messages = [
        SystemMessage(content=sys_prompt),
    ]

    return messages


def get_next_state_using_status(status: dict, state: PlanState):
    # Update the state based on the extracted status
    state["structured_data"]["status"] = status

    if status.get("status") == "DONE":
        state["stage"] = "orchestrator"

    return state


# --- 4. Node: Goal Architect ---
def run_motivator(state: PlanState):
    this_call_messages = 0
    if not state.get("current_context"):
        state["current_context"] = get_initial_context(state)
        this_call_messages += 1

    state["current_context"].append(state["last_user_message"])
    this_call_messages += 1

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)
    response = llm.invoke(state["current_context"])

    state["current_context"].append(response)
    this_call_messages += 1
    state["message_history"] += state["current_context"][-this_call_messages:]

    # Check for signal
    status = extract_json(response.content)
    if status:
        updated_state = get_next_state_using_status(status, state)
        state["current_context"] = []  # Clear context for next agent
        return updated_state

    return state
