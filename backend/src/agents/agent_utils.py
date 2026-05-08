# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage


class AgentMessage(TypedDict):
    agent: str
    message: str


# --- 1. Define the State ---
class PlanState(TypedDict):
    user_context_num_iterations: int
    user_context_status: Optional[str]
    message_to_user: Optional[str]
    message_from_user: Optional[str]
    message_history: Optional[List]  # To keep track of the conversation history

    proposed_plan: Optional[str]
    validator_comments: Optional[str]
    previous_design: Optional[str]
    user_context: Optional[str]
    num_iterations: int
    user_id: Optional[str]

    structured_data: Optional[dict]  # For storing structured outputs from agents


# Agent types
USER_CONTEXT_ACQUIRER = "user_context_acquirer"
GOAL_PLANNER = "goal_planner"
GOAL_VALIDATOR = "goal_validator"
TECHNICAL_TRANSLATOR = "technical_translator"


def initialize_state() -> PlanState:
    return PlanState(
        user_context_num_iterations=0,
        user_context_status="INCOMPLETE",
        message_history=[],
        message_to_user=None,
        message_from_user=None,
        proposed_plan=None,
        validator_comments=None,
        previous_design=None,
        user_context=None,
        num_iterations=0,
        user_id=None,
        structured_data={},
    )


# --- 2. Helper: JSON Extractor ---
import json
import re
from typing import Any, Optional


def extract_json(content: str) -> Optional[Any]:
    """
    Robustly extract the largest valid JSON object or array from a string.
    Handles Markdown code blocks and mixed text.
    """
    if not content:
        return None

    # 1. Strip Markdown Code Blocks (```json ... ```)
    # This regex looks for ``` optionally followed by 'json',
    # capturing the content inside, with DOTALL handling newlines.
    match = re.search(r"```(?:json)?\s*(.*?)```", content, re.DOTALL)
    if match:
        content = match.group(1)

    # 2. Find the starting positions of { and [
    start_brace = content.find("{")
    start_bracket = content.find("[")

    # If neither exists, it's not JSON
    if start_brace == -1 and start_bracket == -1:
        return None

    # 3. Determine the outer bounds based on which appears first
    # We prioritize the first occurring character to capture the main block
    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        start = start_brace
        end = content.rfind("}") + 1
    else:
        start = start_bracket
        end = content.rfind("]") + 1

    # Validation: Ensure we actually found a start and an end
    if start == -1 or end == 0:
        return None

    # 4. Extract and Parse
    json_str = content[start:end]

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Optional: Add error logging here if needed
        return None


def fill_prompt_template(template: str, variables: dict):
    """Function to fill in a prompt template with given variables, written within {{}}"""
    for key, value in variables.items():
        placeholder = "{{" + key + "}}"
        template = template.replace(placeholder, str(value))
    return template
