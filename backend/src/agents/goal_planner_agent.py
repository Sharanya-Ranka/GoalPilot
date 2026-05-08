import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage
from prompts.prompts import GOAL_PLANNER_PROMPT
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
            GOAL_PLANNER_PROMPT,
            dict(
                user_context=state.get("user_context", "None"),
                previous_design=state.get("previous_design", "None"),
                validator_comments=state.get("validator_comments", "None"),
            ),
        )
    )
    full_context = [system_message]
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    response = response.content
    state["proposed_plan"] = response

    return state


def run_goal_planner(state: PlanState):
    logger.info(f"--- Node: Goal Planner | User: {state.get('user_id')} ---")

    context, updated_state = get_full_context(state)

    response = low_reasoning_gpt5mini(context)

    if response == None:
        return state

    new_state = update_state_on_response(updated_state, response)
    # logger.info(f"Transitioning to stage: {new_state.get('stage')}")
    return new_state
