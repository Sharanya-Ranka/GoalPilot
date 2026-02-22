import json

import pathlib
import sys


sys.path.append(
    str(pathlib.Path(sys.path[0]).parent)
)  # Add parent directory to path for imports
# breakpoint()


from schemas.core_v2 import Goal
from agents.milestone_agent import commit_milestones
from agents.agent_utils import PlanState


milestones = """[
    {
      "id": "M1_social_foundation",
      "depends_on": [],
      "statement": "Build a consistent weekly practice of core interpersonal skills (active listening, setting boundaries, expressing appreciation)",      
      "trackers": [
        {
          "metric_type": "BOOLEAN",
          "unit": "sessions",
          "log_prompt": "Did you intentionally practice at least one interpersonal skill (active listening, boundary-setting, or appreciation) in a real interaction this week?",
          "target_range": [
            1,
            1
          ],
          "cadence": "WEEKLY",
          "window_days": 7,
          "success_logic": {
            "type": "STREAK",
            "count": 12
          }
        },
        {
          "metric_type": "SUM",
          "unit": "skills_practiced",
          "log_prompt": "How many distinct interpersonal skills (from the 3) did you practice this week?",
          "target_range": [
            1,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 14,
          "success_logic": {
            "type": "TOTAL_COUNT",
            "count": 12
          }
        }
      ]
    },
    {
      "id": "M2_expand_social_opportunities",
      "depends_on": [
        "M1_social_foundation"
      ],
      "statement": "Attend social/group events at least once every two weeks to expand connections and practice skills",
      "trackers": [
        {
          "metric_type": "SUM",
          "unit": "events",
          "log_prompt": "How many social/group events did you attend in the past 2 weeks?",
          "target_range": [
            1,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 14,
          "success_logic": {
            "type": "TOTAL_COUNT",
            "count": 6
          }
        },
        {
          "metric_type": "SUM",
          "unit": "meaningful_interactions",
          "log_prompt": "How many meaningful one-on-one interactions (≥15 minutes, felt engaging) did you have in the past 2 weeks?",
          "target_range": [
            1,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 14,
          "success_logic": {
            "type": "TOTAL_COUNT",
            "count": 6
          }
        }
      ]
    },
    {
      "id": "M3_deepen_selected_relationships",
      "depends_on": [
        "M1_social_foundation",
        "M2_expand_social_opportunities"
      ],
      "statement": "Develop closer connections with at least 3 people and form 2 new enjoyable regular contacts within 3–6 months",
      "trackers": [
        {
          "metric_type": "SUM",
          "unit": "people_closer",
          "log_prompt": "Over the past month, how many people do you feel noticeably closer to than you did the previous month?",
          "target_range": [
            3,
            null
          ],
          "cadence": "MONTHLY",
          "window_days": 90,
          "success_logic": {
            "type": "ACHIEVED",
            "count": 1
          }
        },
        {
          "metric_type": "SUM",
          "unit": "new_regulars",
          "log_prompt": "In the last 3 months, how many new contacts have become regular enjoyable contacts (meet or message at least biweekly)?",
          "target_range": [
            2,
            null
          ],
          "cadence": "MONTHLY",
          "window_days": 90,
          "success_logic": {
            "type": "ACHIEVED",
            "count": 1
          }
        },
        {
          "metric_type": "SUM",
          "unit": "checkins",
          "log_prompt": "How many planned check-ins (calls, meetups, messages intended to deepen connection) did you do this week?",
          "target_range": [
            1,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 30,
          "success_logic": {
            "type": "TOTAL_COUNT",
            "count": 12
          }
        },
        {
          "metric_type": "LATEST",
          "unit": "relationship_notes",
          "log_prompt": "Optional: Brief note on progress with any one relationship (who, what changed) this week.",
          "target_range": [
            null,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 30,
          "success_logic": {
            "type": "TOTAL_COUNT",
            "count": 12
          }
        }
      ]
    },
    {
      "id": "M4_reflect_and_calibrate",
      "depends_on": [
        "M1_social_foundation",
        "M2_expand_social_opportunities",
        "M3_deepen_selected_relationships"
      ],
      "statement": "Regular reflection to track subjective improvement and adjust approach",
      "trackers": [
        {
          "metric_type": "LATEST",
          "unit": "closeness_score",
          "log_prompt": "On a scale 1–10, how connected/close do you feel to your social life this week?",
          "target_range": [
            6,
            null
          ],
          "cadence": "WEEKLY",
          "window_days": 30,
          "success_logic": {
            "type": "STREAK",
            "count": 8
          }
        },
        {
          "metric_type": "BOOLEAN",
          "unit": "reflection",
          "log_prompt": "Did you complete a weekly reflection and action step based on your social interactions?",
          "target_range": [
            1,
            1
          ],
          "cadence": "WEEKLY",
          "window_days": 7,
          "success_logic": {
            "type": "STREAK",
            "count": 12
          }
        }
      ]
    }
  ]"""


if __name__ == "__main__":
    milestones_data = json.loads(milestones)
    state = PlanState(
        user_id="user_13",
        structured_data={
            "goal": Goal(
                user_id="user_13",
                what="Improve my social life and connections",
                goal_id="Ulzl",
                why="To feel more connected, supported, and fulfilled in my relationships",
                when="Over the next 6 months",
            )
        },
    )
    commit_milestones(milestones_data, state)
