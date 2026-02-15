# server.py
import boto3
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Query
from typing import List, Optional
from agents.agent_graph import build_goal_app
from agents.agent_utils import initialize_state
from langgraph_checkpoint_aws import DynamoDBSaver
from langgraph.graph import StateGraph
from langchain_core.messages import HumanMessage
import logging

# --- Imports ---
# Assumes you have the updated DynamoDBHandler and Pydantic models in these files
from persistence.dynamodb_database import DynamoDBHandler
from schemas.core_v2 import (
    Goal,
    Milestone,
    Tracker,
    LogEntry,
    TrackerUpdate,
    UserRequest,
)

# Initialize App
app = FastAPI(title="Goal Tracker API", version="2.0")


my_session = boto3.session.Session(
    region_name="us-east-1",  # Specify the region
)

# Initialize the saver (make sure you've created the table first or set logic to create it)
checkpointer = DynamoDBSaver(
    table_name="my_graph_checkpoints1",
    region_name="us-east-1",
    enable_checkpoint_compression=True,
    session=my_session,
)
agent_graph = build_goal_app(checkpointer)
logging.getLogger(
    "langgraph_checkpoint_aws.checkpoint.dynamodb.unified_repository"
).setLevel(logging.WARNING)


# --- Dependency Injection ---
# This allows you to swap DynamoDB for TinyDB or MockDB easily in tests
def get_db_handler():
    # In production, you might cache this connection
    return DynamoDBHandler(region_name="us-east-1")


# --- 1. The Dashboard / Aggregate Router (Optimized for Frontend) ---
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@dashboard_router.get("/{user_id}")
def get_user_dashboard(user_id: str, db: DynamoDBHandler = Depends(get_db_handler)):
    """
    The 'One-Shot' endpoint. Fetches Goals, Milestones, and Trackers
    and stitches them into a hierarchy for the mobile app home screen.
    """
    try:
        return db.get_full_user_state(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. Goals Router ---
goals_router = APIRouter(prefix="/goals", tags=["Goals"])


@goals_router.post("/", response_model=Goal)
def create_goal(goal: Goal, db: DynamoDBHandler = Depends(get_db_handler)):
    try:
        db.create_goal(goal)
        return goal
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@goals_router.get("/{user_id}", response_model=List[Goal])
def list_goals(user_id: str, db: DynamoDBHandler = Depends(get_db_handler)):
    # Note: If you use the dashboard endpoint, you rarely need this alone
    return db.get_goals_by_user(user_id)


@goals_router.put("/{goal_id}")
def update_goal(
    goal_id: str, goal: Goal, db: DynamoDBHandler = Depends(get_db_handler)
):
    # Ensure the payload ID matches the URL ID for safety
    if goal.goal_id != goal_id:
        raise HTTPException(status_code=400, detail="ID mismatch in payload")
    db.update_goal(goal)
    return {"status": "updated", "goal_id": goal_id}


# --- 3. Milestones Router ---
milestones_router = APIRouter(prefix="/milestones", tags=["Milestones"])


@milestones_router.post("/", response_model=Milestone)
def create_milestone(
    milestone: Milestone, db: DynamoDBHandler = Depends(get_db_handler)
):
    # We don't need goal_id in the URL because it's in the Pydantic model
    try:
        db.create_milestone(milestone)
        return milestone
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@milestones_router.put("/{milestone_id}")
def update_milestone(
    milestone_id: str,
    milestone: Milestone,
    db: DynamoDBHandler = Depends(get_db_handler),
):
    if milestone.milestone_id != milestone_id:
        raise HTTPException(status_code=400, detail="ID mismatch")
    db.update_milestone(milestone)
    return {"status": "updated", "milestone_id": milestone_id}


# --- 4. Trackers Router ---
trackers_router = APIRouter(prefix="/trackers", tags=["Trackers"])


@trackers_router.post("/", response_model=Tracker)
def create_tracker(tracker: Tracker, db: DynamoDBHandler = Depends(get_db_handler)):
    try:
        db.create_tracker(tracker)
        return tracker
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@trackers_router.put("/{tracker_id}")
def update_tracker(
    tracker_id: str, tracker: Tracker, db: DynamoDBHandler = Depends(get_db_handler)
):
    db.update_tracker(tracker)
    return {"status": "updated"}


# --- 5. Logs / History Router ---
logs_router = APIRouter(prefix="/logs", tags=["Logs"])


@logs_router.post("/", response_model=LogEntry)
def log_progress(update: LogEntry, db: DynamoDBHandler = Depends(get_db_handler)):
    """
    Logs a data point.
    Payload: { "user_id": "...", "tracker_id": "...", "value": 10 }
    """
    try:
        db.log_tracker_update(update)
        return update
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@logs_router.get("/")
def get_tracker_history(
    user_id: str,
    tracker_id: str,
    limit: int = 30,
    db: DynamoDBHandler = Depends(get_db_handler),
):
    """
    Fetches history for a specific tracker using Query Params.
    Usage: GET /logs?user_id=123&tracker_id=456&limit=10
    """
    return db.get_history_logs(user_id, tracker_id, limit)


# --- 6. AI Agent Router (Kept Separate) ---
ai_router = APIRouter(prefix="/ai", tags=["AI Agent"])


@ai_router.post("/chat")
def agent_chat(req: UserRequest):
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
                "to_user": [],
            },
            config,
        )

        # breakpoint()

        return {
            "response": result["to_user"],
            "thread_id": req.thread_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Register Routes ---
app.include_router(dashboard_router)
app.include_router(goals_router)
app.include_router(milestones_router)
app.include_router(trackers_router)
app.include_router(logs_router)
app.include_router(ai_router)


@app.get("/")
def health_check():
    return {"status": "running", "service": "Goal Tracker API v2"}


if __name__ == "__main__":
    uvicorn.run("server_v2:app", host="0.0.0.0", port=8000, reload=True)
