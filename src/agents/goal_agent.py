import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage
from prompts.prompts import GOAL_FORMULATOR_PROMPT
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from persistence.dynamodb_database import DynamoDBHandler
from schemas.core_v2 import Goal

# Setup logging
logger = logging.getLogger(__name__)


def commit_goal(goal: dict, state: PlanState):
    repo = DynamoDBHandler(region_name="us-east-1")
    goal_obj = Goal(
        user_id=state["user_id"], what=goal["what"], when=goal["when"], why=goal["why"]
    )
    repo.create_goal(goal_obj)
    logger.info(f"Goal saved to DynamoDB for user {state['user_id']}")
    return goal_obj


def get_next_agent_using_intent(intent: str):
    next_agent = (
        agent_utils.ORCHESTRATOR
        if intent == "ORCHESTRATOR"
        else agent_utils.GOAL_FORMULATOR
    )
    logger.debug(f"Routing to: {next_agent}")
    return next_agent


def get_full_context(state: PlanState):
    system_message = SystemMessage(
        content=fill_prompt_template(GOAL_FORMULATOR_PROMPT, {})
    )

    context_till_now = state.get("current_context", [])
    user_messages = [state["last_user_message"]] if state["last_user_message"] else []

    # Update local state context
    state["current_context"].extend(user_messages)

    full_context = [system_message] + context_till_now + user_messages
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    try:
        response_json = extract_json(response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed: {e}")
        response_json = {}

    intent = response_json.get("intent")
    is_complete = response_json.get("is_complete", False)
    goal_details = response_json.get("goal_details")
    to_user = response_json.get("to_user")

    state["current_context"].append(response)

    if to_user:
        state["to_user"].append(
            AgentMessage(agent=agent_utils.GOAL_FORMULATOR, message=to_user)
        )

    if intent:
        state["stage"] = get_next_agent_using_intent(intent)

    if is_complete and goal_details:
        goal = commit_goal(goal_details, state)
        state["structured_data"]["goal"] = goal
        state["stage"] = agent_utils.MILESTONE_FORMULATOR
        state["current_context"] = []  # Transitioning to new agent
        logger.info("Goal completion detected. Transitioning to Milestone Formulator.")

    return state


def run_goal_formulator(state: PlanState):
    logger.info(f"--- Node: Goal Formulator | User: {state.get('user_id')} ---")

    context, updated_state = get_full_context(state)
    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)

    try:
        response = llm.invoke(context)
        new_state = update_state_on_response(updated_state, response)
        logger.info(f"Transitioning to stage: {new_state.get('stage')}")
        return new_state
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        return state
