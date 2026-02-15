import requests
from datetime import datetime
from src.schemas.core import (
    Goal,
    Milestone,
    MilestoneTracking,
    CumulativeMetric,
    TargetMetric,
    TrackerUpdate,
)

SERVER_URL = "http://127.0.0.1:8000"


def run_create_test():
    print("--- 1. CREATING A GOAL ---")
    # We generate the ID locally using the Schema, so we know it immediately.
    my_goal = Goal(
        user_id="user_1",
        what="Master Guitar",
        when="2026-12-31",
        why="To play around the campfire",
    )

    # Send to Server
    resp = requests.post(f"{SERVER_URL}/goals", json=my_goal.model_dump())
    if resp.status_code == 200:
        print(f"✅ Goal Created! ID: {my_goal.id}")
    else:
        print(f"❌ Error: {resp.text}")
        return

    print("\n--- 2. ADDING A MILESTONE (With Tracking) ---")

    # A. Define the Tracking Configuration (The "Kwargs" part)
    # We use the specific class (CumulativeMetric) so we get validation support
    practice_config = CumulativeMetric(
        type="CUMULATIVE",
        log_prompt="How many minutes did you practice?",
        min=0,
        max=300,
        target=10000,  # 10,000 minutes total
        target_type="higher better",
    )

    # B. Define the Tracker
    tracker = MilestoneTracking(name="Practice Minutes", config=practice_config)

    # C. Define the Milestone linked to the Goal
    ms = Milestone(
        goal_id=my_goal.id,
        statement="Learn all major pentatonic scales",
        tracking=[tracker],  # Attach the tracker
    )

    # Send to Server
    resp = requests.post(
        f"{SERVER_URL}/milestones",
        json=ms.model_dump(),
        params=dict(goal_id=my_goal.id),
    )
    if resp.status_code == 200:
        print(f"✅ Milestone Created! ID: {ms.id}")
        print(f"   -> Tracker Created! ID: {tracker.id}")
    else:
        print(f"❌ Error: {resp.text}")
        return

    print("\n--- 3. LOGGING HISTORY ---")

    # We want to log 60 minutes of practice for today
    update = TrackerUpdate(
        tracker_id=tracker.id, value=60, date=datetime.now().strftime("%Y-%m-%d")
    )

    # Send to Server
    resp = requests.post(
        f"{SERVER_URL}/trackers/log",
        json=update.model_dump(),
        params=dict(goal_id=my_goal.id),
    )
    if resp.status_code == 200:
        print(f"✅ History Logged! Value: {update.value}")
    else:
        print(f"❌ Error: {resp.text}")


if __name__ == "__main__":
    try:
        run_create_test()
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {SERVER_URL}. Is the server running?")
