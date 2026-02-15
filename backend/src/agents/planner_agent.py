import logging
from typing import List, Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage

from prompts.prompts import PLANNER_PROMPT, PLANNER_CONTEXT
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from persistence.dynamodb_database import DynamoDBHandler
from schemas.core_v2 import (
    Milestone,
    Tracker,
    TargetMetric,
    AchievementMetric,
    CumulativeMetric,
)

# Setup logging
logger = logging.getLogger(__name__)


def get_active_milestones(state: PlanState):
    pass


def get_lifestyle_context(state: PlanState):
    return "None"


def get_previous_plan_context(state: PlanState):
    return "None"


def commit_plan(plan: Any, state: PlanState):
    logger.info(f"Committing plan for user {state['user_id']}")
    logger.info(f"Plan details: {plan}")


def get_next_agent_using_intent(intent: str):
    next_agent = (
        agent_utils.ORCHESTRATOR if intent == "ORCHESTRATOR" else agent_utils.PLANNER
    )
    logger.debug(f"Routing logic determined agent: {next_agent}")
    return next_agent


def get_full_context(state: PlanState):
    system_message = SystemMessage(content=fill_prompt_template(PLANNER_PROMPT, {}))

    active_milestones = get_active_milestones(state)
    lifestyle_context = get_lifestyle_context(state)
    previous_plan_context = get_previous_plan_context(state)

    planner_context = SystemMessage(
        content=fill_prompt_template(
            PLANNER_CONTEXT,
            dict(
                active_milestones=active_milestones,
                lifestyle_context=lifestyle_context,
                previous_plan_context=previous_plan_context,
            ),
        )
    )

    context_till_now = state.get("current_context", [])
    user_messages = [state["last_user_message"]] if state["last_user_message"] else []

    # Persist the new user message into context
    state["current_context"].extend(user_messages)

    full_context = [system_message, planner_context] + context_till_now + user_messages
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    try:
        response_json = extract_json(response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed in Planner : {e}")
        response_json = {}

    intent = response_json.get("intent")
    is_complete = response_json.get("is_complete", False)
    daily_plan = response_json.get("daily_plan")
    to_user = response_json.get("to_user")

    state["current_context"].append(response)

    if to_user:
        state["to_user"].append(
            AgentMessage(agent=agent_utils.PLANNER, message=to_user)
        )

    if intent:
        state["stage"] = get_next_agent_using_intent(intent)

    if is_complete and daily_plan:
        plan_obj = commit_plan(daily_plan, state)
        state["structured_data"]["plan"] = plan_obj
        state["stage"] = agent_utils.ORCHESTRATOR
        state["current_context"] = []  # Clear context for the next phase
        logger.info("Daily plan finalized. Returning control to Orchestrator.")

    return state


def run_planner_agent(state: PlanState):
    logger.info(f"--- Node: Planner Agent | User: {state.get('user_id')} ---")

    context, updated_state = get_full_context(state)

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)

    try:
        response = llm.invoke(context)
        new_state = update_state_on_response(updated_state, response)
        logger.info(f"Transitioning to stage: {new_state.get('stage')}")
        return new_state
    except Exception as e:
        logger.error(f"LLM Error in Planner Agent: {e}")
        return state
