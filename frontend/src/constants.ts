import type { GoalData } from "./types";

export const emptyGoal: GoalData = {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    info: '',
    milestones: []
  };



export const mockGoals: GoalData[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Write a Fantasy Novel 🐉',
    description: 'Complete the first draft of an 80,000-word epic fantasy novel.',
    info: 'Focusing on consistent daily writing habits rather than editing as I go.',
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
            aggregationStrategy: 'SUM',
            targetMin: 10,
            targetMax: null,
            windowNumDays: 14,
            successCriteria: 1,
          },
          {
            id: 't2-novel-1',
            name: 'Chapter Outline Draft',
            info: 'Map out the major plot points for all 30 planned chapters.',
            metric: 'chapters outlined',
            aggregationStrategy: 'ONE-TIME',
            targetMin: 30,
            targetMax: null,
            windowNumDays: 14,
            successCriteria: 1,
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
            aggregationStrategy: 'SUM',
            targetMin: 500,
            targetMax: null,
            windowNumDays: 1,
            successCriteria: 90, // 90 successful days of writing
          }
        ]
      }
    ]
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Run a Marathon 🏃‍♂️',
    description: 'Complete a full 42.195km marathon without stopping.',
    info: 'Following a 16-week beginner marathon training plan. Race day is in October.',
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
            aggregationStrategy: 'SUM',
            targetMin: 25,
            targetMax: 40,
            windowNumDays: 7,
            successCriteria: 4, // 4 successful weeks
          },
          {
            id: 't2-run-1',
            name: 'Consistent Running Days',
            info: 'Get out the door at least 3 times a week.',
            metric: 'runs',
            aggregationStrategy: 'SUM',
            targetMin: 3,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 4,
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
            aggregationStrategy: 'MAX',
            targetMin: 15,
            targetMax: 32,
            windowNumDays: 7,
            successCriteria: 8, // 8 weeks of progressive long runs
          }
        ]
      }
    ]
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: 'Learn Python Programming 🐍',
    description: 'Become proficient in Python for backend development and automation.',
    info: 'Using an online bootcamp course and building a portfolio of small scripts.',
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
            aggregationStrategy: 'SUM',
            targetMin: 3,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 4, // 4 weeks of consistent studying
          },
          {
            id: 't2-python-1',
            name: 'Algorithm Practice',
            info: 'Solve basic logic problems on LeetCode/HackerRank.',
            metric: 'problems',
            aggregationStrategy: 'SUM',
            targetMin: 5,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 4,
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
            aggregationStrategy: 'SUM',
            targetMin: 10,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 3, // 3 weeks of focused building
          },
          {
            id: 't2-python-2',
            name: 'Deploy Application',
            info: 'Push the code to GitHub and host it live on a platform like Heroku/Render.',
            metric: 'deployment',
            aggregationStrategy: 'ONE-TIME',
            targetMin: 1,
            targetMax: 1,
            windowNumDays: 30,
            successCriteria: 1,
          }
        ]
      }
    ]
  }
];
