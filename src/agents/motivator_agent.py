import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage

from prompts.prompts import RESILIENCE_COACH_PROMPT, RESILIENCE_COACH_CONTEXT
from agents.agent_utils import (
    extract_json,
    fill_prompt_template,
    PlanState,
    AgentMessage,
)
import agents.agent_utils as agent_utils
from persistence.dynamodb_database import DynamoDBHandler

# Setup logging
logger = logging.getLogger(__name__)


def get_goal_and_active_milestones(state: PlanState):
    repo = DynamoDBHandler(region_name="us-east-1")
    user_id = state["user_id"]

    # Extract goal_id from the structured intent data
    target_goal_id = state["structured_data"].get("goal_id")

    logger.info(f"Fetching goal {target_goal_id} and milestones for user {user_id}")

    try:
        all_goals = repo.get_goals_for_user(user_id)
        # Find the specific goal the user is talking about
        goal = next((g for g in all_goals if g["id"] == target_goal_id), None)

        if not goal:
            logger.warning(f"Goal {target_goal_id} not found for user {user_id}")
            return {"goal": {}, "active_milestones": []}

        milestones = repo.get_milestones(user_id, goal["id"])
        active_milestones = [m for m in milestones if m.get("status") == "ACTIVE"]

        return {"goal": goal, "active_milestones": active_milestones}
    except Exception as e:
        logger.error(f"Error retrieving goal context: {e}")
        return {"goal": {}, "active_milestones": []}


def get_next_agent_using_intent(intent: str):
    next_agent = (
        agent_utils.ORCHESTRATOR
        if intent == "ORCHESTRATOR"
        else agent_utils.RESILIENCE_COACH
    )
    logger.debug(f"Routing determined: {next_agent}")
    return next_agent


def get_full_context(state: PlanState):
    system_message = SystemMessage(
        content=fill_prompt_template(RESILIENCE_COACH_PROMPT, {})
    )

    goal_info = get_goal_and_active_milestones(state)
    goal_context = SystemMessage(
        content=fill_prompt_template(
            RESILIENCE_COACH_CONTEXT,
            dict(goal_info=goal_info),
        )
    )

    context_till_now = state.get("current_context", [])
    user_messages = [state["last_user_message"]] if state["last_user_message"] else []

    # Maintain session context
    state["current_context"].extend(user_messages)

    full_context = [system_message, goal_context] + context_till_now + user_messages
    return full_context, state


def update_state_on_response(state: PlanState, response: BaseMessage):
    try:
        response_json = extract_json(response.content)
    except Exception as e:
        logger.error(f"JSON extraction failed in Resilience Coach: {e}")
        response_json = {}

    intent = response_json.get("intent")
    is_complete = response_json.get("is_complete", False)
    reflection = response_json.get("captured_reflection")
    to_user = response_json.get("to_user")

    state["current_context"].append(response)

    if to_user:
        state["to_user"].append(
            AgentMessage(agent=agent_utils.RESILIENCE_COACH, message=to_user)
        )

    if intent:
        state["stage"] = get_next_agent_using_intent(intent)

    if is_complete and reflection:
        logger.info(f"Reflection finalized: {reflection[:50]}...")
        state["structured_data"]["reflection"] = reflection
        state["stage"] = agent_utils.ORCHESTRATOR
        state["current_context"] = []  # Reset context for the Orchestrator
        logger.info("Transitioning back to Orchestrator.")

    return state


def run_resilience_coach(state: PlanState):
    logger.info(f"--- Node: Resilience Coach | User: {state.get('user_id')} ---")

    context, updated_state = get_full_context(state)
    logger.info(
        f"Context prepared for LLM: {"\n\n".join([msg.content for msg in context])}"
    )
    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.1)

    try:
        response = llm.invoke(context)
        logger.info(f"LLM Response: {response.content}")
        new_state = update_state_on_response(updated_state, response)
        logger.info(f"Coach node complete. Next stage: {new_state.get('stage')}")
        return new_state
    except Exception as e:
        logger.error(f"LLM Invocation Error: {e}")
        return state
