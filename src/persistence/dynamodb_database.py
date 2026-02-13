import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor
from src.schemas.core_v2 import Goal, Milestone, Tracker, TrackerUpdate, LogEntry


class DynamoDBHandler:
    def __init__(self, region_name="us-east-1"):
        self.dynamodb = boto3.resource("dynamodb", region_name=region_name)

        # Define Table references
        self.goals_table = self.dynamodb.Table("Goals")
        self.milestones_table = self.dynamodb.Table("Milestones")
        self.trackers_table = self.dynamodb.Table("Trackers")
        self.logs_table = self.dynamodb.Table("Logs")

    # --- 1. The "Super Read" (Optimized for Frontend) ---
    def get_full_user_state(self, user_id: str) -> Dict[str, Any]:
        """
        Fetches ALL goals, milestones, and trackers for a user in parallel.
        Returns a hierarchical dictionary:
        {
            "goals": [
                { ...goal_data, "milestones": [
                    { ...milestone_data, "trackers": [ ... ] }
                ]}
            ]
        }
        """
        with ThreadPoolExecutor() as executor:
            future_goals = executor.submit(
                self._query_all_by_user, self.goals_table, user_id
            )
            future_milestones = executor.submit(
                self._query_all_by_user, self.milestones_table, user_id
            )
            future_trackers = executor.submit(
                self._query_all_by_user, self.trackers_table, user_id
            )

            goals_data = future_goals.result()
            milestones_data = future_milestones.result()
            trackers_data = future_trackers.result()

        # Reconstruct the Tree (In-Memory Join)
        # This saves $$$ by avoiding complex Joins or 50 DB calls

        # 1. Index Trackers by Milestone
        trackers_by_milestone = {}
        for t in trackers_data:
            # Reconstruct Pydantic to ensure clean data, then dump back or keep as dict
            # t_obj = Tracker.from_db_format(t)
            m_id = t["milestone_id"]
            if m_id not in trackers_by_milestone:
                trackers_by_milestone[m_id] = []
            trackers_by_milestone[m_id].append(t)

        # 2. Index Milestones by Goal
        milestones_by_goal = {}
        for m in milestones_data:
            m["trackers"] = trackers_by_milestone.get(m["milestone_id"], [])
            g_id = m["goal_id"]
            if g_id not in milestones_by_goal:
                milestones_by_goal[g_id] = []
            milestones_by_goal[g_id].append(m)

        # 3. Attach to Goals
        for g in goals_data:
            g["milestones"] = milestones_by_goal.get(g["goal_id"], [])

        return {"goals": goals_data}

    # --- 2. Standard CRUD (Create) ---
    def create_goal(self, goal: Goal):
        self.goals_table.put_item(Item=goal.to_db_format())

    def create_milestone(self, milestone: Milestone):
        self.milestones_table.put_item(Item=milestone.to_db_format())

    def create_tracker(self, tracker: Tracker):
        self.trackers_table.put_item(Item=tracker.to_db_format())

    def log_tracker_update(self, update: LogEntry):
        """
        Logs a history entry.
        Constructs the composite sort key (tracker_id#date) for efficient querying.
        """
        item = update.to_db_format()
        # Override SK to allow searching by tracker
        # Item structure: user_id (PK), sk (SK), value, ...
        item["sk"] = f"{update.tracker_id}#{update.date}"
        self.logs_table.put_item(Item=item)

    # --- 3. Optimized Reads ---
    def _query_all_by_user(self, table, user_id: str) -> List[Dict]:
        """Helper to fetch all items for a partition key."""
        response = table.query(KeyConditionExpression=Key("user_id").eq(user_id))
        return response.get("Items", [])

    def get_history_logs(self, user_id: str, tracker_id: str, limit: int = 30):
        """
        Fetches logs specifically for ONE tracker.
        Uses the Composite Key trick: SK starts with "tracker_id#"
        """
        response = self.logs_table.query(
            KeyConditionExpression=Key("user_id").eq(user_id)
            & Key("sk").begins_with(f"{tracker_id}#"),
            ScanIndexForward=False,  # Newest first
            Limit=limit,
        )
        # Clean up the 'sk' leakage before returning if desired
        items = response.get("Items", [])
        return items

    def get_goals_for_user(self, user_id: str) -> List[Goal]:
        """Fetches all goals for a user and parses them into Goal Pydantic models."""
        items = self._query_all_by_user(self.goals_table, user_id)
        return [Goal.from_db_format(item) for item in items]

    # --- 4. Updates (Overwrite Strategy) ---
    # In DynamoDB + Pydantic, it's often safer to PUT (overwrite) the whole item
    # than to try and PATCH specific fields, unless you have massive documents.
    def update_goal(self, goal: Goal):
        self.goals_table.put_item(Item=goal.to_db_format())

    def update_milestone(self, milestone: Milestone):
        self.milestones_table.put_item(Item=milestone.to_db_format())

    def update_tracker(self, tracker: Tracker):
        self.trackers_table.put_item(Item=tracker.to_db_format())
