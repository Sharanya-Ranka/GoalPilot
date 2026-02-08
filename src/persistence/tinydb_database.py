from tinydb import TinyDB, Query
from schemas.core import Goal, Milestone, TrackerUpdate
import json
from typing import Annotated, TypedDict, Optional, List

DB_PATH = "goal_app_db.json"


class GoalRepository:
    def __init__(self, db_path=DB_PATH):
        self.db = TinyDB(db_path, indent=4, separators=(",", ": "))
        self.goals_table = self.db.table("goals")

    def create_goal(self, goal: Goal):
        # Dump the entire object (Goal -> [Milestones] -> [Trackers])
        # mode='json' converts UUIDs and Dates to strings automatically
        goal_data = goal.model_dump(mode="json")

        self.goals_table.insert(goal_data)
        return goal.id

    def create_milestones(self, milestones: List[Milestone], goal_id: str = None):
        """
        Appends a list of milestones to an EXISTING goal's list.
        """
        GoalQuery = Query()

        # 1. Search for the parent goal
        #    (We assume goal_id is set correctly)
        results = self.goals_table.search(GoalQuery.id == goal_id)
        if not results:
            raise ValueError(f"Goal {goal_id} not found")

        goal_doc = results[0]

        # 2. Prepare the new milestones data
        ms_data_list = [m.model_dump(mode="json") for m in milestones]

        # 3. Append to the local list
        #    (Handle case where list might not exist yet, though schema usually ensures it)
        current_milestones = goal_doc.get("milestones", [])
        current_milestones.extend(ms_data_list)

        # 4. Save the updated list back to the Goal document
        self.goals_table.update(
            {"milestones": current_milestones}, doc_ids=[goal_doc.doc_id]
        )
        return [m.id for m in milestones]

    def create_milestone(self, m: Milestone, goal_id: str = None):
        """
        Appends a new milestone to an EXISTING goal's list.
        """
        GoalQuery = Query()

        # 1. Search for the parent goal
        #    (We assume m.goal_id is set correctly)
        results = self.goals_table.search(GoalQuery.id == goal_id)
        if not results:
            raise ValueError(f"Goal {goal_id} not found")

        goal_doc = results[0]

        # 2. Prepare the new milestone data
        ms_data = m.model_dump(mode="json")

        # 3. Append to the local list
        #    (Handle case where list might not exist yet, though schema usually ensures it)
        current_milestones = goal_doc.get("milestones", [])
        current_milestones.append(ms_data)

        # 4. Save the updated list back to the Goal document
        self.goals_table.update(
            {"milestones": current_milestones}, doc_ids=[goal_doc.doc_id]
        )
        return m.id

    def update_tracking_history(self, update: TrackerUpdate, goal_id: str):
        """
        Optimized Update:
        We go directly to the known Goal ID, then dig down to the tracker.
        """
        GoalQuery = Query()

        # 1. FAST LOOKUP: Fetch the specific goal directly
        results = self.goals_table.search(GoalQuery.id == goal_id)

        if not results:
            raise ValueError(f"Goal {goal_id} not found")

        goal_doc = results[0]

        # 2. MODIFY IN MEMORY (Digging down the tree)
        milestones = goal_doc["milestones"]
        found = False

        for m in milestones:
            # Safety check: ensure 'trackers' list exists
            trackers = m.get("tracking", [])
            for t in trackers:
                if t["id"] == update.tracker_id:
                    # Update the history!
                    # Ensure history dict exists
                    if "history" not in t:
                        t["history"] = {}

                    t["history"][update.date] = update.value
                    found = True
                    break
            if found:
                break

        if not found:
            raise ValueError(f"Tracker {update.tracker_id} not found in Goal {goal_id}")

        # 3. SAVE THE GOAL
        #    We write the entire modified milestones list back.
        self.goals_table.update({"milestones": milestones}, doc_ids=[goal_doc.doc_id])

        return True

    # --- Helper to see the full tree ---
    def get_goal_tree(self, goal_id: str):
        GoalQuery = Query()
        results = self.goals_table.search(GoalQuery.id == goal_id)
        return results[0] if results else None

    def get_goals_list(self):
        return self.goals_table.all()

    def get_goals_for_user(self, user_id: str):
        GoalQuery = Query()
        results = self.goals_table.search(GoalQuery.user_id == user_id)
        return results

    def get_goal_info_for_user(self, user_id: str, goal_id: str):
        GoalQuery = Query()
        results = self.goals_table.search(
            (GoalQuery.user_id == user_id) & (GoalQuery.id == goal_id)
        )
        return results[0] if results else None

    def get_goals_by_user(self, user_id: str) -> List[Goal]:
        """
        Retrieves all goals for a user and parses them back into Goal Pydantic models.
        """
        GoalQuery = Query()
        results = self.goals_table.search(GoalQuery.user_id == user_id)
        return [Goal.model_validate(res) for res in results]

    def update_goal(self, goal_id: str, goal_update: Goal) -> bool:
        """
        Updates an existing goal document by replacing its content with the new model data.
        """
        GoalQuery = Query()
        goal_data = goal_update.model_dump(mode="json")

        # Ensure we don't accidentally change the ID if it's not in the update
        updated_count = self.goals_table.update(goal_data, GoalQuery.id == goal_id)
        return len(updated_count) > 0

    def update_milestone(self, milestone_id: str, milestone_update: Milestone) -> bool:
        """
        Finds a milestone by its ID within any goal and updates its specific data.
        """
        GoalQuery = Query()
        # We have to iterate through goals because milestones are nested in TinyDB
        all_goals = self.goals_table.all()

        for goal_doc in all_goals:
            milestones = goal_doc.get("milestones", [])
            updated = False

            for i, ms in enumerate(milestones):
                if ms["id"] == milestone_id:
                    # Update the specific milestone in the list
                    milestones[i] = milestone_update.model_dump(mode="json")
                    updated = True
                    break

            if updated:
                self.goals_table.update(
                    {"milestones": milestones}, doc_ids=[goal_doc.doc_id]
                )
                return True

        return False
