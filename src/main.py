import argparse
import sys

# main.py
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver  # <--- Solution for persistence
import sqlite3

# Import your factory function
from agents.test_agent import build_goal_app

# --- Functional Segments ---


def display_goals(args):
    """Functionality 1: Display goals and active milestones."""
    print(f"\n[Fetching Data] Logic for displaying goals goes here.")
    # In a real app, you might filter by args.filter or args.status
    print("-> Goal: Master Python | Milestone: Implement Argparse [ACTIVE]")


def create_goal(args):
    # SETUP: Choose your persistence layer here

    # OPTION A: MemorySaver (Good for testing, bad for restart)
    # checkpointer = MemorySaver()

    # OPTION B: SQLite (Good for local dev, persists across restarts)
    # We use a context manager to ensure the DB connection closes cleanly
    with sqlite3.connect("goal_app_state.db", check_same_thread=False) as conn:
        checkpointer = SqliteSaver(conn)

        # Build the app using the factory
        app = build_goal_app(checkpointer)

        # The Run Loop
        thread_id = {"configurable": {"thread_id": "user_1"}}

        print("--- APP STARTED ---")
        while True:
            user_input = input("User: ")
            if user_input in ["quit", "exit"]:
                break

            breakpoint()

            # Invoke the graph
            events = app.stream(
                {"messages": [HumanMessage(content=user_input)]}, thread_id
            )

            for event in events:
                for node, values in event.items():
                    print(f"[{node.upper()}]: {values['messages'][-1].content}")


# --- Parser Configuration ---


def main():
    parser = argparse.ArgumentParser(
        description="Personal Goal & Milestone Tracker CLI",
        epilog="Keep pushing forward!",
    )

    # Create the subparser object
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command 1: 'view'
    view_parser = subparsers.add_parser(
        "view", help="Display all goals and active milestones"
    )
    # You can add optional flags here, e.g., --all
    view_parser.set_defaults(func=display_goals)

    # Command 2: 'create'
    create_parser = subparsers.add_parser("create", help="Create a new goal")
    # 'name' is a positional argument (required)
    # create_parser.add_argument("name", type=str, help="The title of the goal")
    # # '--deadline' is an optional flag
    # create_parser.add_argument(
    #     "-d", "--deadline", type=str, help="Optional deadline (YYYY-MM-DD)"
    # )
    create_parser.set_defaults(func=create_goal)

    # Parse the arguments
    args = parser.parse_args()

    # Route to the appropriate function
    if hasattr(args, "func"):
        args.func(args)
    else:
        # If no command is provided, show the help menu
        parser.print_help()


if __name__ == "__main__":
    main()
