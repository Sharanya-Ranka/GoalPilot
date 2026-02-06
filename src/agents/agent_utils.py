# agent_graph.py
import json
import operator
from typing import Annotated, TypedDict, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage


# --- 1. Define the State ---
class PlanState(TypedDict):
    message_history: list[BaseMessage]
    current_context: list[BaseMessage]
    last_user_message: HumanMessage
    user_id: str
    structured_data: dict
    stage: str


def initialize_state() -> PlanState:
    return PlanState(
        message_history=[],
        current_context=[],
        last_user_message=HumanMessage(content=""),
        user_id="",  # In real app, this would come from auth/session
        structured_data={},
        stage="orchestrator",  # Start at orchestrator
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
