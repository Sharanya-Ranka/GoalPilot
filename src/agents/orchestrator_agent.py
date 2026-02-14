# agent_graph.py
import json
import operator
import logging
from typing import Annotated, TypedDict, Optional, List

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END

from prompts.prompts import ORCHESTRATOR_PROMPT, ORCHESTRATOR_CONTEXT
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from persistence.tinydb_database import GoalRepository
from persistence.dynamodb_database import DynamoDBHandler

# Configure logging for better visibility in the console
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_user_goals(user_id: str):
    logger.info(f"Fetching goals for user_id: {user_id} from DynamoDB.")
    try:
        repo = DynamoDBHandler(region_name="us-east-1")
        user_goals_results = repo.get_goals_for_user(user_id)

        user_goals_processed = [
            dict(what=g.what, when=g.when, why=g.why, id=g.goal_id)
            for g in user_goals_results
        ]

        logger.info(
            f"Successfully retrieved {len(user_goals_processed)} goals for user: {user_id}"
        )
        return user_goals_processed
    except Exception as e:
        logger.error(f"Failed to fetch goals for user {user_id}: {str(e)}")
        return []


def get_next_agent_using_intent(intent: str):
    next_agent = agent_utils.ORCHESTRATOR
    if intent == "GOAL_FORMATION":
        next_agent = agent_utils.GOAL_FORMULATOR
    elif intent == "MOTIVATION":
        next_agent = agent_utils.RESILIENCE_COACH
    elif intent == "DAY_PLANNING":
        next_agent = agent_utils.PLANNER
    elif intent == "PROGRESS_TRACKING":
        next_agent = agent_utils.TRACKING_LOGGER

    logger.debug(f"Intent '{intent}' mapped to agent: {next_agent}")
    return next_agent


def get_full_context(state: PlanState):
    logger.info(f"Building full context for user: {state.get('user_id')}")

    system_message = SystemMessage(
        content=fill_prompt_template(ORCHESTRATOR_PROMPT, dict())
    )

    user_goals = get_user_goals(user_id=state["user_id"])
    goals_context = SystemMessage(
        content=fill_prompt_template(
            ORCHESTRATOR_CONTEXT,
            dict(user_goals=user_goals),
        )
    )

    context_till_now = state.get("current_context", [])
    user_messages = (
        [state["last_user_message"]] if state["last_user_message"].content else []
    )

    state["current_context"].extend(user_messages)

    full_context = [system_message, goals_context] + context_till_now + user_messages

    logger.debug(f"Total message count in context: {len(full_context)}")
    # Note: Keep the breakpoint for manual debugging if needed,
    # but logging often replaces the need for it.
    # breakpoint()

    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    logger.info("Processing LLM response to update state.")

    try:
        response_json = extract_json(response.content)
        logger.debug(f"Extracted JSON from response: {response_json}")
    except Exception as e:
        logger.error(
            f"Failed to extract JSON from LLM response: {response.content}. Error: {e}"
        )
        response_json = {}

    intent = response_json.get("intent")
    goal_id = response_json.get("goal_id")
    to_user = response_json.get("to_user")

    if to_user:
        logger.info(f"Adding message to user queue: {to_user[:50]}...")
        state["to_user"].append(
            AgentMessage(agent=agent_utils.ORCHESTRATOR, message=to_user)
        )

    if intent:
        old_stage = state.get("stage", "None")
        state["stage"] = get_next_agent_using_intent(intent)
        logger.info(
            f"State transition: {old_stage} -> {state['stage']} based on intent: {intent}"
        )

    if goal_id:
        logger.debug(f"Setting active goal_id in state: {goal_id}")
        state["structured_data"]["goal_id"] = goal_id

    return state


def run_orchestrator(state: PlanState):
    logger.info("--- Starting Orchestrator Node ---")
    # breakpoint()
    context, updated_state = get_full_context(state)
    logger.info(f"Context prepared for LLM: {[msg.content for msg in context]}")
    logger.info("Invoking LLM (gpt-4.1-mini)...")
    try:
        llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)
        response = llm.invoke(context)
        logger.info(f"LLM response received successfully.\n{response.content}")
    except Exception as e:
        logger.error(f"LLM invocation failed: {str(e)}")
        # You might want to handle this by returning to a safety state
        return state
    # breakpoint()
    new_state = update_state_on_response(updated_state, response)

    logger.info(
        f"--- Finished Orchestrator Node. Next stage: {new_state.get('stage')} ---"
    )
    return new_state
