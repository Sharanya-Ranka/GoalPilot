import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from prompts.prompts import USER_CONTEXT_PROMPT
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from llms.openai_api import low_reasoning_gpt5mini

# Setup logging
logger = logging.getLogger(__name__)


def get_full_context(state: PlanState):
    system_message = SystemMessage(
        content=fill_prompt_template(USER_CONTEXT_PROMPT, dict())
    )
    state["message_history"] = state.get("message_history", []) + [
        HumanMessage(content=state.get("message_from_user", ""))
    ]
    history = state.get("message_history", [])

    full_context = [system_message] + history
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    try:
        response_json = extract_json(response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed in User Context Agent: {e}")
        response_json = {}

    status = response_json.get("status", "INCOMPLETE")
    message_to_user = response_json.get("message_to_user", "")

    state["user_context_status"] = status
    state["message_to_user"] = message_to_user
    state["message_history"] = state.get("message_history", []) + [response]

    goal_description = response_json.get("goal_description")
    deadline = response_json.get("deadline")
    constraints = response_json.get("constraints")
    preferences = response_json.get("preferences")
    current_status = response_json.get("current_status")
    additional_info = response_json.get("additional_info")

    user_context = f"Goal Description: {goal_description}\nDeadline: {deadline}\nConstraints: {constraints}\nPreferences: {preferences}\nCurrent Status: {current_status}\nAdditional Information: {additional_info}"

    state["user_context"] = user_context
    state["user_context_num_iterations"] = (
        state.get("user_context_num_iterations", 0) + 1
    )

    return state


def run_user_context_agent(state: PlanState):
    logger.info(f"--- Node: User Context Agent | User: {state.get('user_id')} ---")

    context, updated_state = get_full_context(state)

    response = low_reasoning_gpt5mini(context)

    if response == None:
        return state

    new_state = update_state_on_response(updated_state, response)
    return new_state
