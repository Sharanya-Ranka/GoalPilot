from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor
from schemas.core_v2 import Goal, Milestone, Tracker, LogEntry


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
            trackers_by_milestone[m_id].append(
                Tracker.from_db_format(t).model_dump(mode="json")
            )

        # 2. Index Milestones by Goal
        milestones_by_goal = {}
        for m in milestones_data:
            mtemp = Milestone.from_db_format(m).model_dump(mode="json")
            mtemp["trackers"] = trackers_by_milestone.get(m["milestone_id"], [])
            g_id = m["goal_id"]
            if g_id not in milestones_by_goal:
                milestones_by_goal[g_id] = []
            milestones_by_goal[g_id].append(mtemp)

        goals_nested = []
        # 3. Attach to Goals
        for g in goals_data:
            gtemp = Goal.from_db_format(g).model_dump(mode="json")
            gtemp["milestones"] = milestones_by_goal.get(g["goal_id"], [])
            goals_nested.append(gtemp)

        return {"goals": goals_nested}

    # --- 2. Standard CRUD (Create) ---
    def create_goal(self, goal: Goal):
        self.goals_table.put_item(Item=goal.to_db_format())

    def create_milestone(self, milestone: Milestone):
        self.milestones_table.put_item(Item=milestone.to_db_format())

    def create_tracker(self, tracker: Tracker):
        self.trackers_table.put_item(Item=tracker.to_db_format())

    def log_tracker_update(self, update: LogEntry, tracker: Tracker):
        """
        Atomically writes the log and updates the tracker aggregation.
        """
        # TransactWriteItems requires the low-level client
        client = self.dynamodb.meta.client

        timestamp_str = update.timestamp.isoformat()
        log_value_str = str(update.value)  # Boto3 client requires numbers as strings
        # breakpoint()

        # 1. Prepare the Put operation for the Logs table
        # Based on your get_history_logs, PK is 'user_id' and SK is 'sk'
        log_put = {
            "Put": {
                "TableName": self.logs_table.name,
                "Item": {
                    "user_id": update.user_id,
                    "sk": f"{update.tracker_id}#{timestamp_str}",
                    "timestamp": timestamp_str,
                    "value": log_value_str,
                    "tracker_id": update.tracker_id,
                },
            }
        }

        # 2. Prepare the Update operation for the Trackers table
        tracker_key = {
            "user_id": tracker.user_id,
            "tracker_id": tracker.tracker_id,
        }

        update_action = {}

        if tracker.metric_type == "SUM":
            # Atomic addition (safe for concurrent requests)
            update_action = {
                "Update": {
                    "TableName": self.trackers_table.name,
                    "Key": tracker_key,
                    "UpdateExpression": "SET current_value = current_value + :val, last_log_date = :ts",
                    "ExpressionAttributeValues": {
                        ":val": Decimal(
                            log_value_str
                        ),  # DynamoDB expects Decimal for numbers
                        ":ts": timestamp_str,
                    },
                }
            }
        elif tracker.metric_type in ["LATEST", "BOOLEAN"]:
            # Conditional update: Only overwrite if this log is newer
            update_action = {
                "Update": {
                    "TableName": self.trackers_table.name,
                    "Key": tracker_key,
                    "UpdateExpression": "SET current_value = :val, last_log_date = :ts",
                    "ConditionExpression": "attribute_not_exists(last_log_date) OR last_log_date < :ts",
                    "ExpressionAttributeValues": {
                        ":val": Decimal(log_value_str),
                        ":ts": timestamp_str,
                    },
                }
            }

        # 3. Execute the Transaction
        try:
            client.transact_write_items(
                TransactItems=[log_put, update_action]
            )  # update_action (DEBUG: DOESN"T WORK WITH THIS)
        except client.exceptions.TransactionCanceledException as e:
            # Check if the transaction was canceled because of our ConditionExpression
            # This happens if a delayed log arrives for a LATEST/BOOLEAN tracker.
            if "ConditionalCheckFailed" in str(e):
                # We still want to save the historical log, we just don't want it
                # to overwrite the newer 'current_value' on the tracker.
                # Use the high-level resource here for a simple put.
                self.logs_table.put_item(
                    Item={
                        "user_id": update.user_id,
                        "sk": f"{update.tracker_id}#{timestamp_str}",
                        "timestamp": timestamp_str,
                        "value": Decimal(log_value_str),  # Resource requires Decimal
                        "tracker_id": update.tracker_id,
                    }
                )
            else:
                # Re-raise if it failed for any other reason (capacity, permissions, etc.)
                breakpoint()
                raise e

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

    def get_milestones(self, user_id: str, goal_id: str = None) -> Dict[str, Any]:
        """Fetches milestones for a user and given goal. If no goal is given, fetch all"""
        milestones = self._query_all_by_user(self.milestones_table, user_id)

        milestones = [
            Milestone.from_db_format(m)
            for m in milestones
            if not goal_id or m["goal_id"] == goal_id
        ]

        return milestones

    def get_tracker(self, user_id: str, tracker_id: str) -> Optional[Tracker]:
        """Fetches a single tracker by user_id and tracker_id."""
        response = self.trackers_table.get_item(
            Key={"user_id": user_id, "tracker_id": tracker_id}
        )
        item = response.get("Item")
        if item:
            return Tracker.from_db_format(item)
        return None

    # --- 4. Updates (Overwrite Strategy) ---
    # In DynamoDB + Pydantic, it's often safer to PUT (overwrite) the whole item
    # than to try and PATCH specific fields, unless you have massive documents.
    def update_goal(self, goal: Goal):
        self.goals_table.put_item(Item=goal.to_db_format())

    def update_milestone(self, milestone: Milestone):
        self.milestones_table.put_item(Item=milestone.to_db_format())

    def update_tracker(self, tracker: Tracker):
        self.trackers_table.put_item(Item=tracker.to_db_format())
