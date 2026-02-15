# schemas.py
from typing import List, Dict, Any, Optional, Literal, Union
from pydantic import BaseModel, Field
from typing_extensions import Annotated
import uuid
from datetime import datetime
import secrets
import string


def generate_real_id():
    return str(uuid.uuid4())


def generate_id(length=4):
    # Use uppercase, lowercase, and digits
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# --- 1. Polymorphic Tracker Configs (The "kwargs" solution) ---
class AchievementMetric(BaseModel):
    type: Literal["ACHIEVEMENT"]
    log_prompt: str


class CumulativeMetric(BaseModel):
    type: Literal["CUMULATIVE"]
    log_prompt: str
    min: float = 0
    max: float
    target: float
    target_type: Literal["higher better", "lower better"]


class TargetMetric(BaseModel):
    type: Literal["TARGET"]
    log_prompt: str
    window: int
    target_type: str
    min: float = 0
    max: float = 0
    target: Optional[float] = None
    target_min: Optional[float] = None
    target_max: Optional[float] = None


# The Union Type
TrackerConfig = Annotated[
    Union[AchievementMetric, CumulativeMetric, TargetMetric],
    Field(discriminator="type"),
]

# --- 2. Main Domain Models ---


class MilestoneTracking(BaseModel):
    id: str = Field(default_factory=generate_id)
    # milestone_id: str = ""
    # name: str
    # We nest the specific config here
    config: TrackerConfig
    history: Dict[str, Any] = Field(default_factory=dict)


class Milestone(BaseModel):
    id: str = Field(default_factory=generate_id)
    # goal_id: str
    statement: str
    status: str = "pending"
    tracking: List[MilestoneTracking] = Field(default_factory=list)


class Goal(BaseModel):
    id: str = Field(default_factory=generate_id)
    user_id: str
    what: str
    when: str
    why: str
    milestones: List[Milestone] = Field(default_factory=list)


# --- 3. Interaction Models ---


class TrackerUpdate(BaseModel):
    tracker_id: str
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    value: Any


class UserRequest(BaseModel):
    message: str
    thread_id: str = "user_1"


class StateResponse(BaseModel):
    thread_id: str
    messages: List[str]
    current_step: Optional[str] = "unknown"
    # We can now type these strictly if we want, or keep them loose
    concrete_goal: Optional[Any] = None
    milestones: Optional[List[Milestone]] = None
