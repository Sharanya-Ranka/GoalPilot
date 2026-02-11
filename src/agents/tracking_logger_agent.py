import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from prompts.prompts import MILESTONE_FORMULATOR_PROMPT
from agents.agent_utils import extract_json, fill_prompt_template, PlanState
from persistence.tinydb_database import GoalRepository
from schemas.core import (
    Goal,
    Milestone,
    MilestoneTracking,
    TargetMetric,
    AchievementMetric,
    CumulativeMetric,
)


def get_metric(metric_data: dict):
    if metric_data.get("type").lower() == "target":
        return TargetMetric(**metric_data)
    elif metric_data.get("type").lower() == "achievement":
        return AchievementMetric(**metric_data)
    elif metric_data.get("type").lower() == "cumulative":
        return CumulativeMetric(**metric_data)
    else:
        raise ValueError(f"Unknown metric type: {metric_data.get('type')}")


def commit_milestones(milestones: List, state: PlanState):
    milestones_objs = []
    for m in milestones:
        tracking = []
        for t in m.get("tracking", []):
            # breakpoint()
            config = get_metric(t)
            tracking.append(MilestoneTracking(config=config))
        milestone_obj = Milestone(
            statement=m["statement"],
            tracking=tracking,
        )

        milestones_objs.append(milestone_obj)

    breakpoint()

    repo = GoalRepository()

    repo.create_milestones(
        milestones_objs, goal_id=state["structured_data"]["goal"]["id"]
    )


def get_initial_context(state: PlanState):

    # Start with the orchestrator prompt
    sys_prompt = fill_prompt_template(
        MILESTONE_FORMULATOR_PROMPT, dict(goal_info=state["structured_data"]["goal"])
    )

    messages = [
        SystemMessage(content=sys_prompt),
    ]

    return messages


def update_state_on_completion(milestones: list, state: PlanState):
    state["structured_data"]["milestones"] = milestones
    state["stage"] = "orchestrator"
    state["current_context"] = []  # Clear context for next agent

    return state


# --- 4. Node: Goal Architect ---
def run_milestone_formulator(state: PlanState):
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
    milestones = extract_json(response.content)
    if milestones:
        commit_milestones(milestones, state)
        updated_state = update_state_on_completion(milestones, state)
        return updated_state

    return state
