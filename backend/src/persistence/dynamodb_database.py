import boto3
from typing import Dict, Any
import json
import logging


class DynamoDBHandler:
    def __init__(self, region_name="us-east-1"):
        self.dynamodb = boto3.resource("dynamodb", region_name=region_name)
        # Assuming table has Partition Key: 'user_id'
        self.goals_table = self.dynamodb.Table("Goals")

    # --- 1. The Super Read (Now 1 Line of Logic) ---
    def get_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Fetches the complete nested document for the user.
        Structure: {"user_id": "...", "goals": [ { "milestones": [ { "trackers": [ {"logs": []} ] } ] } ] }
        """
        response = self.goals_table.get_item(Key={"user_id": user_id})
        # Default to an empty structure if it's a brand new user
        return response.get("Item", {"user_id": user_id, "goals": "[]"})

    # --- 2. The Universal Mutation Engine ---
    def process_operation(
        self, user_id: str, operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Consumes an operation dictionary, applies the mutation to the in-memory document,
        and saves the entire document back to DynamoDB.
        """
        user_data = self.get_user_data(user_id)
        action = operation.get("action")
        payload = operation.get("payload", {})

        # --- CREATE / APPEND OPERATIONS ---
        if action == "create_goal":
            goals_str = user_data["goals"]
            goals = json.loads(goals_str)
            goals.append(payload.to_db_format())
            modified_goals_str = json.dumps(goals)
            user_data["goals"] = modified_goals_str

        elif action == "create_milestone":
            goal_id = operation.get("goal_id")
            for goal in user_data["goals"]:
                if goal.get("goal_id") == goal_id:
                    goal.setdefault("milestones", []).append(payload)
                    break

        elif action == "create_tracker":
            goal_id, milestone_id = operation.get("goal_id"), operation.get(
                "milestone_id"
            )
            for g in user_data["goals"]:
                if g.get("goal_id") == goal_id:
                    for m in g.get("milestones", []):
                        if m.get("milestone_id") == milestone_id:
                            m.setdefault("trackers", []).append(payload)
                            break

        # --- LOGGING & UPDATING OPERATIONS ---
        elif action == "log_update":
            tracker_id = operation.get("tracker_id")
            logging.info(f"Will update log with tracker id={tracker_id}")

            goals_str = user_data["goals"]
            goals = json.loads(goals_str)

            # Deep traversal to find the specific tracker
            for g in goals:
                for m in g.get("milestones", []):
                    for t in m.get("trackers", []):
                        logging.info(f"Current Tracker id={t.get('id', "")}")
                        if t.get("id") == tracker_id:

                            # 1. Append the log
                            t.setdefault("logs", []).append(payload.to_db_format())
                            break

            modified_goals_str = json.dumps(goals)
            user_data["goals"] = modified_goals_str

        # Overwrite the document in DynamoDB with the mutated state
        self.goals_table.put_item(Item=user_data)

        goals = json.loads(user_data["goals"])
        logging.info(f"New goals after process operation\n{goals}")

        return goals
