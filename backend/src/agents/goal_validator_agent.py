import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage
from prompts.prompts import GOAL_VALIDATOR_PROMPT
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
        content=fill_prompt_template(
            GOAL_VALIDATOR_PROMPT,
            dict(
                user_context=state.get("user_context", "None"),
                proposed_plan=state.get("proposed_plan", "None"),
            ),
        )
    )
    full_context = [system_message]
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    try:
        response_json = extract_json(response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed in Milestone Formulator: {e}")
        response_json = {}

    state["previous_design"] = state.get("proposed_plan", "None")
    state["validator_comments"] = str(response_json)
    state["validation_status"] = response_json.get("status", "FAILED")

    return state


def run_goal_validator(state: PlanState):
    logger.info(f"--- Node: Goal Validator | User: {state.get('user_id')} ---")

    state["num_iterations"] = state.get("num_iterations", 0) + 1

    context, updated_state = get_full_context(state)

    # breakpoint()

    response = low_reasoning_gpt5mini(context)

    if response == None:
        return state

    new_state = update_state_on_response(updated_state, response)
    logger.info(f"Transitioning to stage: {new_state.get('stage')}")
    return new_state
