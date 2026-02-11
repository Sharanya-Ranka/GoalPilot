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


# --- 2. Main Tracker Model ---
class Tracker(BaseModel):
    # Unencrypted Index/Link Fields
    user_id: str
    milestone_id: str
    tracker_id: str = Field(default_factory=generate_id)

    # Descriptive Config (to be bundled into JSON/Encrypted)
    config: TrackerConfig

    def to_db_format(self) -> Dict[str, Any]:
        """Prepares the tracker config for encrypted storage."""
        return {
            "user_id": self.user_id,
            "milestone_id": self.milestone_id,
            "tracker_id": self.tracker_id,
            # We dump the polymorphic config into the tracker_json
            "tracker_json": self.config.model_dump(),
        }

    @classmethod
    def from_db_format(cls, data: Dict[str, Any]) -> "Tracker":
        """Reconstructs the tracker from a decrypted DB record."""
        return cls(
            user_id=data["user_id"],
            milestone_id=data["milestone_id"],
            tracker_id=data["tracker_id"],
            # Pydantic's Union Discriminator handles the type-casting automatically
            config=data.get("tracker_json"),
        )


class LogEntry(BaseModel):
    user_id: str
    tracker_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    value: float

    def to_db_format(self) -> Dict[str, Any]:
        """
        Prepares the log for storage.
        Values are typically stored in plaintext columns for easier querying.
        """
        return {
            "user_id": self.user_id,
            "tracker_id": self.tracker_id,
            "timestamp": self.timestamp.isoformat(),
            "value": self.value,
        }

    @classmethod
    def from_db_format(cls, data: Dict[str, Any]) -> "LogEntry":
        return cls(
            user_id=data["user_id"],
            tracker_id=data["tracker_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            value=data["value"],
        )


class Milestone(BaseModel):
    # Unencrypted Index/Link Fields
    user_id: str
    goal_id: str
    milestone_id: str = Field(default_factory=generate_id)

    # Descriptive Fields (to be bundled into JSON/Encrypted)
    statement: str
    status: str = "pending"
    depends_on: List[str] = Field(default_factory=list)

    def to_db_format(self) -> Dict[str, Any]:
        """Bundles statement and status for encrypted storage."""
        return {
            "user_id": self.user_id,
            "goal_id": self.goal_id,
            "milestone_id": self.milestone_id,
            "milestone_json": {
                "statement": self.statement,
                "status": self.status,
                "depends_on": self.depends_on,
            },
        }

    @classmethod
    def from_db_format(cls, data: Dict[str, Any]) -> "Milestone":
        """Flatten the milestone_json back into the Pydantic model."""
        details = data.get("milestone_json", {})

        return cls(
            user_id=data["user_id"],
            goal_id=data["goal_id"],
            milestone_id=data["milestone_id"],
            statement=details.get("statement"),
            status=details.get("status", "pending"),
            depends_on=details.get("depends_on", []),
        )


class Goal(BaseModel):
    user_id: str
    goal_id: str = Field(default_factory=generate_id)

    what: str
    when: str
    why: str

    def to_db_format(self) -> Dict[str, Any]:
        """Prepares the object for encrypted DB storage."""
        return {
            "user_id": self.user_id,
            "goal_id": self.goal_id,
            "goal_json": {"what": self.what, "when": self.when, "why": self.why},
        }

    @classmethod
    def from_db_format(cls, data: Dict[str, Any]) -> "Goal":
        """Reconstructs the flat model from a decrypted DB record."""
        # Use .get() or access the nested goal_json key
        details = data.get("goal_json", {})

        return cls(
            user_id=data["user_id"],
            goal_id=data["goal_id"],
            what=details.get("what"),
            when=details.get("when"),
            why=details.get("why"),
        )


# --- 3. Interaction Models ---


class TrackerUpdate(BaseModel):
    tracker_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
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
