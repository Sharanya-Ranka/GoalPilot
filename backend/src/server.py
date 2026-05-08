# server.py
import boto3
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Body
from typing import List, Optional
from agents.agent_graph import build_goal_app
from agents.agent_utils import initialize_state
from langgraph_checkpoint_aws import DynamoDBSaver
from langgraph.graph import StateGraph
from langchain_core.messages import HumanMessage
import logging
import json

# --- Imports ---
# Assumes you have the updated DynamoDBHandler and Pydantic models in these files
from persistence.dynamodb_database import DynamoDBHandler
from schemas.core import (
    Goal,
    Milestone,
    Tracker,
    Log,
    UserRequest,
)

# Initialize App
app = FastAPI(title="Goal Tracker API", version="2.0")

# Define the origins that are allowed to talk to your API
# Adjust the ports depending on what your frontend uses (e.g., React is usually 3000, Vite is 5173)
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)


my_session = boto3.session.Session(
    region_name="us-east-1",  # Specify the region
)

# Initialize the saver (make sure you've created the table first or set logic to create it)
checkpointer = DynamoDBSaver(
    table_name="my_graph_checkpoints",
    region_name="us-east-1",
    enable_checkpoint_compression=True,
    session=my_session,
)
agent_graph = build_goal_app(checkpointer)
logging.getLogger(
    "langgraph_checkpoint_aws.checkpoint.dynamodb.unified_repository"
).setLevel(logging.WARNING)

logging.basicConfig(level=logging.INFO)


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
        return db.get_user_data(user_id)
    except Exception as e:
        # breakpoint()
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. Goals Router ---
goals_router = APIRouter(prefix="/goals", tags=["Goals"])


@goals_router.post("/")
def create_goal(
    goal: Goal = Body(...),
    user_id: str = Body(...),  # Explicitly pull user_id from the JSON body
    db: DynamoDBHandler = Depends(get_db_handler),
):
    try:
        user_new_data = db.process_operation(
            user_id=user_id, operation=dict(action="create_goal", payload=goal)
        )
        return user_new_data
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail=str(e))


@goals_router.get("/{user_id}")
def list_goals(user_id: str, db: DynamoDBHandler = Depends(get_db_handler)):
    goals = json.loads(db.get_user_data(user_id=user_id)["goals"])
    return goals


@goals_router.put("/{goal_id}")
def update_goal(
    goal_id: str, goal: Goal, db: DynamoDBHandler = Depends(get_db_handler)
):
    # Ensure the payload ID matches the URL ID for safety
    if goal.goal_id != goal_id:
        raise HTTPException(status_code=400, detail="ID mismatch in payload")
    db.update_goal(goal)
    return {"status": "updated", "goal_id": goal_id}


# --- 5. Logs / History Router ---
logs_router = APIRouter(prefix="/logs", tags=["Logs"])


@logs_router.post("/")
def log_progress(
    log: Log = Body(...),
    user_id: str = Body(...),  # Explicitly pull user_id from the JSON body
    tracker_id: str = Body(...),
    db: DynamoDBHandler = Depends(get_db_handler),
):
    """
    Logs a data point.
    Payload: { "user_id": "...", "tracker_id": "...", "value": 10 }
    """
    try:
        # breakpoint()
        user_new_data = db.process_operation(
            user_id=user_id,
            operation={
                "action": "log_update",
                "tracker_id": tracker_id,
                "payload": log,
            },
        )
        return user_new_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
                "message_from_user": req.message,
                "user_id": req.thread_id,
            },
            config,
        )

        # breakpoint()
        logging.info(f"Final state after invocation {req.thread_id}:\n{result}")

        return {
            "response": result["message_to_user"],
            "thread_id": req.thread_id,
            "structured_data": result.get("structured_data", {}),
        }
    except Exception as e:
        logging.error(f"Error in AI Chat\n{str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Register Routes ---
app.include_router(dashboard_router)
app.include_router(goals_router)
app.include_router(logs_router)
app.include_router(ai_router)


@app.get("/")
def health_check():
    return {"status": "running", "service": "Goal Tracker API v2"}


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
