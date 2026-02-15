# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from prompts.prompts import EVALUATOR_PROMPT, ARCHITECT_PROMPT


# --- 1. Define the State ---
class PlanState(TypedDict):
    # We use 'add_messages' to automatically append new chats to history
    messages: Annotated[list[BaseMessage], operator.add]
    concrete_goal: Optional[str]
    milestones: Optional[dict]
    # A flag to track if we need to clear context for the next agent
    stage: str  # "evaluator" or "architect"


# --- 2. Helper: JSON Extractor ---
def extract_json(content: str, key: str):
    """Robustly find a specific key in a JSON block within text."""
    try:
        # Find the first '{' and last '}'
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == -1:
            return None

        data = json.loads(content[start:end])
        return data.get(key)
    except:
        return None


# --- 3. Node: Goal Evaluator ---
def run_evaluator(state: PlanState):
    # Only use messages if we are strictly in the evaluator stage
    # (This prevents old Architect messages from leaking in if we looped back)
    messages = state["messages"]

    sys_prompt = EVALUATOR_PROMPT

    # Call LLM
    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)
    response = llm.invoke([SystemMessage(content=sys_prompt)] + messages)

    # Check for the signal
    goal = extract_json(response.content, "concrete_goal")

    if goal:
        # Signal found! Update goal, and set stage to architect.
        # We also return the AI message so the user sees the confirmation.
        return {"messages": [response], "concrete_goal": goal, "stage": "architect"}

    # No signal, just continue chat
    return {"messages": [response], "stage": "evaluator"}


# --- 4. Node: Goal Architect ---
def run_architect(state: PlanState):
    # MESSAGE QUEUE CLEARING LOGIC:
    # The Architect should NOT see the messy back-and-forth from the Evaluator.
    # We construct a FRESH context using only the concrete goal and recent messages.

    # 1. Filter messages: only keep messages created AFTER the stage switched to 'architect'
    # In a real DB we'd filter by timestamp/ID, but here we can just grab the last N
    # if we assume the UI handles display.
    # For this script, we will just pass the SYSTEM prompt and the LAST user message
    # if it's a new turn, or the conversation history if we are already deep in architecting.

    messages = state["messages"]
    concrete_goal = state["concrete_goal"]

    sys_prompt = ARCHITECT_PROMPT

    # We strip the history if it belongs to the previous phase to keep context clean
    # (Simple heuristic: if history is huge but we just switched stages, crop it)
    relevant_messages = [
        SystemMessage(content=sys_prompt),
        HumanMessage(content=str(concrete_goal)),
    ] + messages[-10:]

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)
    response = llm.invoke(relevant_messages)

    # Check for signal
    milestones = extract_json(response.content, "milestones")

    if milestones:
        return {"messages": [response], "milestones": milestones}

    return {"messages": [response]}


def route_step(state: PlanState):
    if state.get("milestones"):
        return END
    if state.get("concrete_goal"):
        return "architect"
    return "evaluator"


# --- 3. The Factory Function ---
def build_goal_app(checkpointer):
    """
    Constructs and compiles the graph with a specific checkpointer.
    Returns the runnable 'app'.
    """
    workflow = StateGraph(PlanState)

    workflow.add_node("evaluator", run_evaluator)
    workflow.add_node("architect", run_architect)

    # Entry Logic
    def entry_gate(state: PlanState):
        if state.get("concrete_goal"):
            return "architect"
        return "evaluator"

    workflow.set_conditional_entry_point(
        entry_gate, {"evaluator": "evaluator", "architect": "architect"}
    )

    # Edges
    workflow.add_conditional_edges(
        "evaluator", route_step, {"evaluator": END, "architect": "architect", END: END}
    )
    workflow.add_conditional_edges(
        "architect", route_step, {"architect": END, END: END}
    )

    # Compile with the passed checkpointer
    return workflow.compile(checkpointer=checkpointer)
