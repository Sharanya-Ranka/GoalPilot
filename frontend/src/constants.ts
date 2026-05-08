import type { Goal } from "./types";

export const getEmptyGoal = (): Goal => {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    milestones: []
  };
}


export const mockGoals: Goal[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Write a Fantasy Novel 🐉',
    description: 'Complete the first draft of an 80,000-word epic fantasy novel.',
    milestones: [
      {
        id: 'm1-novel-1',
        statement: 'Complete Worldbuilding and Detailed Outline',
        trackers: [
          {
            id: 't1-novel-1',
            name: 'Character Profiles',
            info: 'Create detailed backstories and motivations for main characters.',
            metric: 'characters',
            strategy: 'SUM',
            target:[ 10,  null],
            window: 14,
            success_criteria: 1,
            logs: []
          },
          {
            id: 't2-novel-1',
            name: 'Chapter Outline Draft',
            info: 'Map out the major plot points for all 30 planned chapters.',
            metric: 'chapters outlined',
            strategy: 'ONE-TIME',
            target:[ 30,  null],
            window: 14,
            success_criteria: 1,
            logs: []
          }
        ]
      },
      {
        id: 'm2-novel-2',
        statement: 'Write the First Draft',
        trackers: [
          {
            id: 't1-novel-2',
            name: 'Daily Word Count',
            info: 'Write new words every day. Do not edit previous chapters.',
            metric: 'words',
            strategy: 'SUM',
            target:[ 500,  null],
            window: 1,
            success_criteria: 90, // 90 successful days of writing
            logs: []
          }
        ]
      }
    ]
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Run a Marathon 🏃‍♂️',
    description: 'Complete a full 42.195km marathon without stopping.',
    milestones: [
      {
        id: 'm1-run-1',
        statement: 'Build Base Mileage and Habit',
        trackers: [
          {
            id: 't1-run-1',
            name: 'Weekly Total Distance',
            info: 'Accumulate enough easy miles to build aerobic capacity.',
            metric: 'km',
            strategy: 'SUM',
            target:[ 25,  40],
            window: 7,
            success_criteria: 4, // 4 successful weeks
            logs: []
          },
          {
            id: 't2-run-1',
            name: 'Consistent Running Days',
            info: 'Get out the door at least 3 times a week.',
            metric: 'runs',
            strategy: 'SUM',
            target:[ 3,  null],
            window: 7,
            success_criteria: 4,
            logs: []
          }
        ]
      },
      {
        id: 'm2-run-2',
        statement: 'Increase Endurance (Long Runs)',
        trackers: [
          {
            id: 't1-run-2',
            name: 'Weekend Long Run Length',
            info: 'Gradually increase the distance of the single longest run of the week.',
            metric: 'km',
            strategy: 'MAX',
            target:[ 15,  32],
            window: 7,
            success_criteria: 8, // 8 weeks of progressive long runs
            logs: []
          }
        ]
      }
    ]
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: 'Learn Python Programming 🐍',
    description: 'Become proficient in Python for backend development and automation.',
    milestones: [
      {
        id: 'm1-python-1',
        statement: 'Master the Fundamentals',
        trackers: [
          {
            id: 't1-python-1',
            name: 'Course Modules Completed',
            info: 'Watch lectures and complete the end-of-module quizzes.',
            metric: 'modules',
            strategy: 'SUM',
            target:[ 3,  null],
            window: 7,
            success_criteria: 4, // 4 weeks of consistent studying
            logs: []
          },
          {
            id: 't2-python-1',
            name: 'Algorithm Practice',
            info: 'Solve basic logic problems on LeetCode/HackerRank.',
            metric: 'problems',
            strategy: 'SUM',
            target:[ 5,  null],
            window: 7,
            success_criteria: 4,
            logs: []
          }
        ]
      },
      {
        id: 'm2-python-2',
        statement: 'Build a Real-World Application',
        trackers: [
          {
            id: 't1-python-2',
            name: 'Deep Work Coding Sessions',
            info: 'Uninterrupted time spent writing code for the portfolio project.',
            metric: 'hours',
            strategy: 'SUM',
            target:[ 10,  null],
            window: 7,
            success_criteria: 3, // 3 weeks of focused building
            logs: []
          },
          {
            id: 't2-python-2',
            name: 'Deploy Application',
            info: 'Push the code to GitHub and host it live on a platform like Heroku/Render.',
            metric: 'deployment',
            strategy: 'ONE-TIME',
            target:[ 1,  1],
            window: 30,
            success_criteria: 1,
            logs: []
          }
        ]
      }
    ]
  }
];
