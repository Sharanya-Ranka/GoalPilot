import requests
from datetime import datetime
from schemas.core_v2 import (
    Goal,
    Milestone,
    Tracker,
    SuccessLogic,
    TrackerUpdate,
    LogEntry,
)

SERVER_URL = "http://127.0.0.1:8000"


def run_create_test():
    print("--- 1. CREATING A GOAL ---")
    # We generate the ID locally using the Schema, so we know it immediately.
    user_id = "user_11"
    my_goal = Goal(
        user_id=user_id,
        what="TestGoal",
        when="Eternity",
        why="Why not?",
    )

    # Send to Server
    resp = requests.post(f"{SERVER_URL}/goals/", json=my_goal.model_dump())
    if resp.status_code == 200:
        print(f"✅ Goal Created! ID: {my_goal.goal_id}")
    else:
        print(f"❌ Error: {resp.text}")
        return

    print("\n--- 2. ADDING A MILESTONE (With Tracking) ---")

    # # A. Define the Tracking Configuration (The "Kwargs" part)
    # # We use the specific class (CumulativeMetric) so we get validation support
    # practice_config = CumulativeMetric(
    #     type="CUMULATIVE",
    #     log_prompt="How many minutes did you practice?",
    #     min=0,
    #     max=300,
    #     target=10000,  # 10,000 minutes total
    #     target_type="higher better",
    # )

    # # B. Define the Tracker
    # tracker = MilestoneTracking(name="Practice Minutes", config=practice_config)

    # C. Define the Milestone linked to the Goal
    ms1 = Milestone(
        user_id=user_id,
        goal_id=my_goal.goal_id,
        statement="Test Milestone 1",
        status="active",
        depends_on=[],
    )
    ms2 = Milestone(
        user_id=user_id,
        goal_id=my_goal.goal_id,
        statement="Test Milestone 2",
        status="pending",
        depends_on=[ms1.milestone_id],
    )

    # Send to Server
    resp1 = requests.post(
        f"{SERVER_URL}/milestones/",
        json=ms1.model_dump(mode="json"),
    )

    resp2 = requests.post(
        f"{SERVER_URL}/milestones/",
        json=ms2.model_dump(mode="json"),
    )

    t1 = Tracker(
        user_id=user_id,
        milestone_id=ms1.milestone_id,
        metric_type="SUM",
        unit="km",
        log_prompt="How many total km did you run today?",
        target_range=[30, None],
        cadence="DAILY",
        window_days=10,
        current_value=0,
        last_log_date=datetime(2026, 1, 1),
        success_logic=SuccessLogic(type="TOTAL_COUNT", count=10),
    )

    t2 = Tracker(
        user_id=user_id,
        milestone_id=ms2.milestone_id,
        metric_type="LATEST",
        unit="kg",
        log_prompt="Weight today?",
        target_range=[55, 65],
        cadence="DAILY",
        window_days=10,
        current_value=50,
        last_log_date=datetime(2026, 1, 1),
        success_logic=SuccessLogic(type="STREAK", count=10),
    )

    t3 = Tracker(
        user_id=user_id,
        milestone_id=ms2.milestone_id,
        metric_type="BOOLEAN",
        unit="",
        log_prompt="Incorporated company?",
        target_range=[1, 1],
        cadence="DAILY",
        window_days=10,
        current_value=0,
        last_log_date=datetime(2026, 1, 1),
        success_logic=SuccessLogic(type="ACHIEVED", count=10),
    )

    resp1 = requests.post(
        f"{SERVER_URL}/trackers/",
        json=t1.model_dump(mode="json"),
    )
    if resp1.status_code == 200:
        print(f"✅ Tracker 1 Created! ID: {t1.tracker_id}")
    else:
        print(f"❌ Error: {resp1.text}")
        return

    resp2 = requests.post(
        f"{SERVER_URL}/trackers/",
        json=t2.model_dump(mode="json"),
    )

    resp3 = requests.post(
        f"{SERVER_URL}/trackers/",
        json=t3.model_dump(mode="json"),
    )

    t1_logs = [("2026-01-02", 5), ("2026-01-05", 4), ("2026-01-08", 10)]
    t2_logs = [("2026-01-02", 56), ("2026-01-05", 54), ("2026-01-08", 60)]
    t3_logs = [("2026-01-02", 0), ("2026-01-05", 0), ("2026-01-08", 1)]

    for tracker, tracker_logs in zip([t2, t1, t3], [t2_logs, t1_logs, t3_logs]):
        for dt_str, value in tracker_logs:
            tu = LogEntry(
                user_id=user_id,
                tracker_id=tracker.tracker_id,
                timestamp=datetime.strptime(dt_str, "%Y-%m-%d"),
                value=value,
            )

            resp = requests.post(
                f"{SERVER_URL}/logs/",
                json=tu.model_dump(mode="json"),
            )

            if resp.status_code == 200:
                print(f"Log Created! ID: {tu.tracker_id}")
            else:
                print(f"❌ Error: {resp.text}")
                return


if __name__ == "__main__":
    try:
        run_create_test()
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {SERVER_URL}. Is the server running?")
