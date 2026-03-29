import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage
from prompts.prompts import (
    STRATEGIC_COACH_PROMPT,
    COACH_END_DETECTOR_PROMPT,
    COACH_END_DETECTOR_CONTEXT,
)
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from persistence.dynamodb_database import DynamoDBHandler
from schemas.core_v2 import Goal
from llms.openai_api import low_reasoning_gpt5mini

# Setup logging
logger = logging.getLogger(__name__)


def get_next_agent_using_intent(intent: str):
    next_agent = (
        agent_utils.ORCHESTRATOR
        if intent == "ORCHESTRATOR"
        else agent_utils.TECHNICAL_TRANSLATOR
    )
    logger.debug(f"Routing to: {next_agent}")
    return next_agent


def get_full_context(state: PlanState):
    system_message = SystemMessage(
        content=fill_prompt_template(STRATEGIC_COACH_PROMPT, {})
    )

    context_till_now = state.get("current_context", [])
    user_messages = [state["last_user_message"]] if state["last_user_message"] else []

    # Update local state context
    state["current_context"].extend(user_messages)

    full_context = [system_message] + context_till_now + user_messages
    return full_context, state


def get_end_detector_context(response: BaseMessage):
    system_message = SystemMessage(
        content=fill_prompt_template(COACH_END_DETECTOR_PROMPT, {})
    )

    response_content = response.content if response else ""
    message = SystemMessage(
        content=fill_prompt_template(
            COACH_END_DETECTOR_CONTEXT,
            dict(last_message=response_content),
        )
    )

    full_context = [system_message, message]
    return full_context


def update_state_on_response(
    state: PlanState, response: BaseMessage, end_detector_response: BaseMessage
):
    try:
        end_detector_response_json = extract_json(end_detector_response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed in Strategic Coach end detection: {e}")
        end_detector_response_json = {}

    response = response.content
    is_done = (
        True
        if end_detector_response_json.get("status", "not done") == "done"
        else False
    )
    reroute_orchestrator = (
        True
        if end_detector_response_json.get("routing", None) == "ORCHESTRATOR"
        else False
    )

    state["current_context"].append(response)

    state["to_user"].append(
        AgentMessage(agent=agent_utils.STRATEGIC_COACH, message=response)
    )

    if is_done:
        intent = "TECHNICAL_TRANSLATOR"
        state["stage"] = get_next_agent_using_intent(intent)
        state["structured_data"]["handover_summary"] = response
        state["current_context"] = []  # Clear context for the next phase
        logger.info(
            "Natural Language Goal formulation completed. Transitioning to Technical Translator."
        )

    if reroute_orchestrator:
        intent = "ORCHESTRATOR"
        state["stage"] = get_next_agent_using_intent(intent)
        logger.info("Change of intent detected. Transitioning to Orchestrator.")

    return state


def run_strategic_coach(state: PlanState):
    logger.info(f"--- Node: Strategic Coach | User: {state.get('user_id')} ---")

    # breakpoint()

    context, updated_state = get_full_context(state)

    # logger.info(f"Context prepared for LLM: {[msg.content for msg in context]}")
    response = low_reasoning_gpt5mini(context)

    end_detector_context = get_end_detector_context(response)
    end_detector_response = low_reasoning_gpt5mini(end_detector_context)

    if response == None:
        return state

    new_state = update_state_on_response(updated_state, response, end_detector_response)
    logger.info(f"Transitioning to stage: {new_state.get('stage')}")
    return new_state
