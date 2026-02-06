# database.py
import sqlite3
from schemas import Goal, Milestone, MilestoneTracking, TrackerUpdate
import json

DB_NAME = "goal_app_state.db"


class GoalRepository:
    def __init__(self, db_path=DB_NAME):
        self.db_path = db_path
        self._init_tables()

    def _get_conn(self):
        # Helper to get a connection (ensures valid context)
        return sqlite3.connect(self.db_path)

    def _init_tables(self):
        """Creates the tables if they don't exist."""
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS goals (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT, 
                    due_date TEXT, reason TEXT
                )
            """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS milestones (
                    id TEXT PRIMARY KEY, goal_id TEXT, statement TEXT, 
                    status TEXT, metadata TEXT
                )
            """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS milestone_updates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    milestone_id TEXT, new_status TEXT, 
                    note TEXT, timestamp TEXT
                )
            """
            )

            # NEW: Table for the trackers
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS milestone_trackers (
                    id TEXT PRIMARY KEY,
                    milestone_id TEXT,
                    name TEXT,
                    type TEXT,
                    prompt TEXT,
                    satisfaction_criteria TEXT, -- JSON Storage
                    history TEXT                -- JSON Storage
                )
            """
            )

    # --- CORE METHODS ---

    def create_goal(self, goal: Goal):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO goals (id, user_id, title, due_date, reason) VALUES (?, ?, ?, ?, ?)",
                (goal.id, goal.user_id, goal.what, goal.when, goal.why),
            )
            # Recursively save any milestones attached to this goal
            for m in goal.milestones:
                self.create_milestone(m)
        return goal.id

    def create_milestone(self, m: Milestone):
        with self._get_conn() as conn:
            # 1. Save the Milestone itself
            conn.execute(
                "INSERT INTO milestones (id, goal_id, statement, status) VALUES (?, ?, ?, ?)",
                (m.id, m.goal_id, m.statement, m.status),
            )

            # 2. Save the attached Trackers
            for t in m.trackers:
                # Ensure the link is set
                t.milestone_id = m.id
                conn.execute(
                    """INSERT INTO milestone_trackers 
                       (id, milestone_id, name, type, prompt, satisfaction_criteria, history) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        t.id,
                        t.milestone_id,
                        t.name,
                        t.type,
                        t.prompt,
                        json.dumps(t.satisfaction_criteria),  # Serialize Dict -> String
                        json.dumps(t.history),  # Serialize Dict -> String
                    ),
                )
        return m.id

    # --- NEW: The Method for "AddMilestoneUpdate" ---
    def update_tracker_history(self, update: TrackerUpdate):
        """
        Updates the history dictionary of a specific tracker.
        This is a 'Read-Modify-Write' operation in SQLite.
        """
        with self._get_conn() as conn:
            cursor = conn.cursor()

            # 1. Fetch current history (JSON string)
            cursor.execute(
                "SELECT history FROM milestone_trackers WHERE id = ?",
                (update.tracker_id,),
            )
            row = cursor.fetchone()

            if not row:
                raise ValueError(f"Tracker {update.tracker_id} not found")

            # 2. Deserialize: JSON String -> Python Dict
            current_history = json.loads(row[0])

            # 3. Modify: Add the new entry
            current_history[update.date] = update.value

            # 4. Serialize & Save: Python Dict -> JSON String
            cursor.execute(
                "UPDATE milestone_trackers SET history = ? WHERE id = ?",
                (json.dumps(current_history), update.tracker_id),
            )
