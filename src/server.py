# server.py
import sqlite3
from fastapi import FastAPI, HTTPException, Depends
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite import SqliteSaver

# --- Imports from our shared modules ---
from persistence.tinydb_database import GoalRepository  # The DB Logic
from schemas.core import (  # The Data Models
    UserRequest,
    StateResponse,
    Goal,
    Milestone,
    TrackerUpdate,
)

# from agents.test_agent import build_goal_app
from agents.agent_graph import build_goal_app  # The Agent Graph Factory
from agents.agent_utils import initialize_state

app = FastAPI()

# --- 1. Setup Global State ---

# A. LangGraph Persistence (Checkpoints)
conn = sqlite3.connect("goal_app_state.db", check_same_thread=False)
checkpointer = SqliteSaver(conn)
agent_graph = build_goal_app(checkpointer)

# B. Business Data Persistence (The Repository)
# We initialize this once. It handles its own connections.
repo = GoalRepository()

# --- 2. API Endpoints: Chat & Graph State ---


@app.get("/")
def health_check():
    return {"status": "running", "service": "Goal Tracker API"}


@app.get("/state")
def get_state(thread_id: str = None, last_n_messages: int = 5):
    config = {"configurable": {"thread_id": thread_id}}
    current_state = agent_graph.get_state(config)

    if not current_state.values:
        return {"error": "No state found for this thread"}

    all_messages = current_state.values.get("messages", [])

    # Format messages for the client
    formatted_msgs = [
        f"{msg.type}: {msg.content}" for msg in all_messages[-last_n_messages:]
    ]

    return StateResponse(
        thread_id=thread_id,
        messages=formatted_msgs,
        current_step=str(current_state.next),
        concrete_goal=current_state.values.get("concrete_goal"),
        milestones=current_state.values.get("milestones"),
    )


@app.post("/chat")
def chat_endpoint(req: UserRequest):
    config = {"configurable": {"thread_id": req.thread_id}}
    current_state = agent_graph.get_state(config)

    if not current_state.values:
        # Initialize state for this thread if it doesn't exist
        initial_state = initialize_state()
        agent_graph.update_state(config, initial_state)

    try:
        # Run the agent
        result = agent_graph.invoke(
            {
                "last_user_message": HumanMessage(content=req.message),
                "user_id": req.thread_id,
            },
            config,
        )

        return {
            "response": result["current_context"][-1].content,
            "thread_id": req.thread_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 3. API Endpoints: Database / Goal Management ---
# These bypass the LLM and talk directly to the SQLite Repository


@app.post("/goals")
def create_goal_endpoint(goal: Goal):
    """
    Directly creates a goal (and its milestones) in the DB.
    Usage: Client sends a JSON matching the 'Goal' schema.
    """
    try:
        goal_id = repo.create_goal(goal)
        return {"status": "success", "goal_id": goal_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/milestones")
def create_milestone_endpoint(m: Milestone, goal_id: str):
    """
    Adds a milestone to an existing goal.
    """
    try:
        ms_id = repo.create_milestone(m, goal_id)
        return {"status": "success", "milestone_id": ms_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/trackers/log")
def log_tracker_endpoint(update: TrackerUpdate, goal_id: str):
    """
    Logs user progress (history) for a specific tracker.
    Input: { "tracker_id": "...", "value": 10, "date": "2025-02-01" }
    """
    try:
        repo.update_tracking_history(update, goal_id)
        return {"status": "updated", "tracker_id": update.tracker_id}
    except ValueError as e:
        # Handle "Tracker not found" specifically
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/goals/{user_id}", response_model=list[Goal])
def get_user_goals(user_id: str):
    """
    Retrieves all goals belonging to a specific user.
    """
    try:
        goals = repo.get_goals_by_user(user_id)
        if not goals:
            return []
        return goals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/goals/{goal_id}")
def update_goal_endpoint(goal_id: str, goal_update: Goal):
    """
    Updates an existing goal's metadata or specification.
    """
    try:
        # Assuming repo.update_goal handles the logic of merging/replacing
        success = repo.update_goal(goal_id, goal_update)
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")
        return {"status": "success", "goal_id": goal_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/milestones/{milestone_id}")
def update_milestone_endpoint(milestone_id: str, milestone_update: Milestone):
    """
    Updates a specific milestone's status, deadline, or description.
    """
    try:
        success = repo.update_milestone(milestone_id, milestone_update)
        if not success:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return {"status": "success", "milestone_id": milestone_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
