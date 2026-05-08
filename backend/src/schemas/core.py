# schemas.py
import json
from typing import List, Dict, Any, Optional, Literal, Union, Tuple
from pydantic import BaseModel, Field
from typing_extensions import Annotated
import uuid
from datetime import datetime
import secrets
import string
from decimal import Decimal

from typing import Literal, Optional, List, Tuple
from pydantic import BaseModel


# ==========================================
# 1. Types & Interfaces
# ==========================================
def generate_uuid() -> str:
    return str(uuid.uuid4())


# Using Literal is the direct equivalent of a TypeScript string union type
AggregationStrategy = Literal["SUM", "MEAN", "MIN", "MAX", "ONE-TIME", "ALL"]


class Log(BaseModel):
    date: str
    value: float  # TS 'number' maps best to float, but you can use int if these are strictly integers
    log_message: Optional[str] = None

    def to_db_format(self) -> Dict[str, Any]:
        """
        Prepares the Goal for storage.
        Values are typically stored in plaintext columns for easier querying.
        """
        return json.loads(self.model_dump_json())


class Tracker(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name_id: Optional[str] = None
    name: str
    info: str
    metric: str
    strategy: AggregationStrategy
    # A fixed-length array in TS becomes a Tuple in Python
    target: Tuple[Optional[float], Optional[float]]
    window: float
    success_criteria: float
    logs: List[Log] = Field(default_factory=list)


class Milestone(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name_id: Optional[str] = None
    statement: str
    trackers: List[Tracker]


class Goal(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name_id: Optional[str] = None
    title: str
    description: str
    milestones: List[Milestone]

    def to_db_format(self) -> Dict[str, Any]:
        """
        Prepares the Goal for storage.
        Values are typically stored in plaintext columns for easier querying.
        """
        return json.loads(self.model_dump_json())

    @classmethod
    def from_db_format(cls, data: Dict[str, Any]) -> "Goal":
        return cls(**data)


class AllGoals(BaseModel):
    goals: List[Goal]


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
