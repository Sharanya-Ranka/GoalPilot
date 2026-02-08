# client.py (Updated sections)
import argparse
import sys
import requests
import json
from datetime import datetime

SERVER_URL = "http://127.0.0.1:8000"


def view_state(args):
    thread_id = "user_1"
    print(f"[Client] Fetching state for {thread_id}...")
    response = requests.get(f"{SERVER_URL}/state", params={"thread_id": thread_id})

    if response.status_code == 200:
        data = response.json()
        print(f"--- STATE SNAPSHOT (Next: {data['current_step']}) ---")
        for msg in data["messages"]:
            print(msg)
        print(f"\nConcrete Goal: {json.dumps(data['concrete_goal'], indent=2)}")
        print(f"\nMilestones: {json.dumps(data['milestones'], indent=2)}")
    else:
        print(f"Error fetching state: {response.status_code}")


def chat_with_agent(args):
    """
    Renamed from create_goal. Interactive Chat Loop.
    """
    thread_id = "user_2"
    print(f"--- CHAT SESSION STARTED ({SERVER_URL}) ---")
    print(f"Session ID: {thread_id}")

    while True:
        try:
            user_input = input("User: ")
        except KeyboardInterrupt:
            break

        if user_input.lower() in ["quit", "exit"]:
            break

        payload = {"message": user_input, "thread_id": thread_id}
        try:
            response = requests.post(f"{SERVER_URL}/chat", json=payload)
            if response.status_code == 200:
                data = response.json()
                print(f"[AGENT]: {data['response']}")
            else:
                print(f"[ERROR {response.status_code}]: {response.text}")
        except requests.exceptions.ConnectionError:
            print(f"[ERROR]: Could not connect to server at {SERVER_URL}.")


def track_progress(args):
    """
    Iterates through active milestones and logs tracker updates.
    """
    user_id = "user_2"  # Should ideally be an arg or config
    print(f"--- DAILY TRACKING FOR {user_id} ---")

    # 1. Get all goals for the user
    try:
        response = requests.get(f"{SERVER_URL}/goals/{user_id}")
        if response.status_code != 200:
            print(f"Failed to fetch goals: {response.text}")
            return

        goals = response.json()
        if not goals:
            print("No goals found. Go create some!")
            return

        for goal in goals:
            print(f"\nTarget Goal: {goal['what']}")

            # 2. Check active milestones
            for milestone in goal.get("milestones", []):
                if milestone.get("status") == "active":
                    print(f"  > Milestone: {milestone['statement']}")

                    # 3. Ask tracker prompts
                    for tracking_item in milestone.get("tracking", []):
                        config = tracking_item.get("config", {})
                        prompt = config.get("log_prompt", "Enter value:")

                        user_val = input(f"    [LOG] {prompt} ")

                        if not user_val.strip():
                            continue

                        # 4. Post update to server
                        update_payload = {
                            "tracker_id": tracking_item["id"],
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "value": user_val,
                        }

                        log_res = requests.post(
                            f"{SERVER_URL}/trackers/log",
                            json=update_payload,
                            params={"goal_id": goal["id"]},
                        )

                        if log_res.status_code == 200:
                            print(f"    ✅ Logged.")
                        else:
                            print(f"    ❌ Error: {log_res.text}")

    except Exception as e:
        print(f"An error occurred: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Personal Goal & Milestone Tracker CLI (Client)",
        epilog="Keep pushing forward!",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: 'view'
    view_parser = subparsers.add_parser("view", help="Display current state")
    view_parser.set_defaults(func=view_state)

    # Command: 'chat' (Renamed from 'create')
    chat_parser = subparsers.add_parser("chat", help="Interact with the goal agent")
    chat_parser.set_defaults(func=chat_with_agent)

    # Command: 'track' (New)
    track_parser = subparsers.add_parser("track", help="Log daily progress updates")
    track_parser.set_defaults(func=track_progress)

    args = parser.parse_args()

    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
