# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from prompts.prompts import ORCHESTRATOR_PROMPT
from agents.agent_utils import extract_json, fill_prompt_template, PlanState
from persistence.tinydb_database import GoalRepository


def get_initial_context(state: PlanState):
    repo = GoalRepository()
    user_goals_results = repo.get_goals_for_user(state["user_id"])
    user_goals = [
        dict(what=g["what"], when=g["when"], why=g["why"], id=g["id"])
        for g in user_goals_results
    ]
    # Start with the orchestrator prompt
    sys_prompt = fill_prompt_template(ORCHESTRATOR_PROMPT, dict(user_goals=user_goals))

    messages = [
        SystemMessage(content=sys_prompt),
    ]

    return messages


def get_next_state_using_intent(intent: dict, state: PlanState):
    # Update the state based on the extracted intent
    state["structured_data"]["intent"] = intent

    if intent.get("intent") == "NEW_GOAL":
        state["stage"] = "goal_formulator"
    elif intent.get("intent") == "MOTIVATION":
        state["stage"] = "motivator"
    else:
        state["stage"] = "orchestrator"  # Stay in orchestrator if unclear

    return state


# --- 4. Node: Goal Architect ---
def run_orchestrator(state: PlanState):
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
    breakpoint()

    # Check for signal
    intent = extract_json(response.content)
    if intent:
        updated_state = get_next_state_using_intent(intent, state)
        state["current_context"] = []  # Clear context for next agent
        return updated_state

    return state
