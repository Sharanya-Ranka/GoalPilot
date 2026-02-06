# client.py
import argparse
import sys
import requests
import pprint
import json

SERVER_URL = "http://127.0.0.1:8000"


def view_state(args):
    thread_id = "user_1"
    print(f"[Client] Fetching state for {thread_id}...")

    # Note: We pass data in 'params', not 'json'
    response = requests.get(f"{SERVER_URL}/state", params={"thread_id": thread_id})

    if response.status_code == 200:
        data = response.json()
        print(f"--- STATE SNAPSHOT (Next: {data['current_step']}) ---")
        for msg in data["messages"]:
            print(msg)
        # print(data["messages"])
        print(f"\nConcrete Goal: {json.dumps(data['concrete_goal'], indent=2)}")
        print(f"\nMilestones: {json.dumps(data['milestones'], indent=2)}")
    else:
        print("Error fetching state.")
        print(f"[ERROR {response}")


def create_goal(args):
    """
    Functionality 2: Interactive Chat Loop.
    """
    # Unique ID for this session (could be generated or passed as arg)
    thread_id = "user_2"

    print(f"--- APP STARTED (Connected to {SERVER_URL}) ---")
    print(f"Session ID: {thread_id}")

    while True:
        try:
            user_input = input("User: ")
        except KeyboardInterrupt:
            break

        if user_input.lower() in ["quit", "exit"]:
            break

        # Payload to send to server
        payload = {"message": user_input, "thread_id": thread_id}

        try:
            # Send POST request to server
            response = requests.post(f"{SERVER_URL}/chat", json=payload)

            if response.status_code == 200:
                data = response.json()
                print(f"[AGENT]: {data['response']}")
            else:
                print(f"[ERROR {response.status_code}]: {response.text}")

        except requests.exceptions.ConnectionError:
            print(
                f"[ERROR]: Could not connect to server at {SERVER_URL}. Is it running?"
            )


# --- Parser Configuration (Same as before) ---


def main():
    parser = argparse.ArgumentParser(
        description="Personal Goal & Milestone Tracker CLI (Client)",
        epilog="Keep pushing forward!",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command 1: 'view'
    view_parser = subparsers.add_parser("view", help="Display current state")
    view_parser.set_defaults(func=view_state)

    # Command 2: 'create'
    create_parser = subparsers.add_parser("create", help="Interact with the goal agent")
    create_parser.set_defaults(func=create_goal)

    args = parser.parse_args()

    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
