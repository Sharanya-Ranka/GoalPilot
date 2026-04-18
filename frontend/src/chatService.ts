import type { GoalData } from "./types";


const mock_created_goal: GoalData = {
    id: 'b89a3120-7bfa-4c12-91d5-88e2c0a13b45',
    title: 'Become a World-Class Baker 🥐',
    description: 'Master the art of baking artisanal breads, delicate pastries, and advanced French desserts.',
    info: 'Starting with mastering sourdough fermentation before moving on to laminated doughs.',
    milestones: [
      {
        id: 'm1-bake-1',
        statement: 'Master Sourdough and Yeast Basics',
        trackers: [
          {
            id: 't1-bake-1',
            name: 'Feed the Starter',
            info: 'Maintain a healthy, active sourdough starter by feeding it daily.',
            metric: 'feedings',
            aggregationStrategy: 'SUM',
            targetMin: 7,
            targetMax: 7,
            windowNumDays: 7,
            successCriteria: 4, // 4 weeks of consistent feeding
          },
          {
            id: 't2-bake-1',
            name: 'Bake Practice Loaves',
            info: 'Bake and evaluate the crumb structure of sourdough loaves.',
            metric: 'loaves',
            aggregationStrategy: 'SUM',
            targetMin: 2,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 6, // 6 successful weeks of baking
          }
        ]
      },
      {
        id: 'm2-bake-2',
        statement: 'Conquer French Patisserie',
        trackers: [
          {
            id: 't1-bake-2',
            name: 'Lamination Practice',
            info: 'Practice making croissants or pain au chocolat to perfect butter layers.',
            metric: 'batches',
            aggregationStrategy: 'SUM',
            targetMin: 1,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 4,
          },
          {
            id: 't2-bake-2',
            name: 'Perfect the Macaron',
            info: 'Achieve smooth tops and distinct "feet" on French macarons.',
            metric: 'successful batches',
            aggregationStrategy: 'SUM',
            targetMin: 1,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 3, 
          }
        ]
      }
    ]
  }

const mock_updated_goal: GoalData ={
    id: 'c9f0a231-1bfa-4c12-91d5-88e2c0a13c99',
    title: 'Learn Horse Riding 🐎',
    description: 'Progress from a complete beginner to confidently jumping small courses independently.',
    info: 'Taking bi-weekly lessons at the local equestrian center and focusing on core strength.',
    milestones: [
      {
        id: 'm1-ride-1',
        statement: 'Fundamentals of Horsemanship (Walk & Trot)',
        trackers: [
          {
            id: 't1-ride-1',
            name: 'Saddle Time',
            info: 'Attend formal riding lessons focusing on posture, balance, and the posting trot.',
            metric: 'lessons',
            aggregationStrategy: 'SUM',
            targetMin: 2,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 12, // 12 weeks of consistent lessons
          },
          {
            id: 't2-ride-1',
            name: 'Equestrian Core Workout',
            info: 'Off-saddle exercises (pilates/yoga) to improve riding seat and balance.',
            metric: 'sessions',
            aggregationStrategy: 'SUM',
            targetMin: 3,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 8,
          }
        ]
      },
      {
        id: 'm2-ride-2',
        statement: 'Advanced Basics (Canter & Cavaletti)',
        trackers: [
          {
            id: 't1-ride-2',
            name: 'No-Stirrup Practice',
            info: 'Ride portions of the lesson without stirrups to deepen the seat.',
            metric: 'minutes',
            aggregationStrategy: 'MEAN',
            targetMin: 15,
            targetMax: null,
            windowNumDays: 7,
            successCriteria: 4,
          },
          {
            id: 't2-ride-2',
            name: 'Clear a Cavaletti Course',
            info: 'Successfully navigate a course of ground poles and cross-rails at a canter.',
            metric: 'instructor pass',
            aggregationStrategy: 'ONE-TIME',
            targetMin: 1,
            targetMax: 1,
            windowNumDays: 30,
            successCriteria: 1, // Pass the assessment once
          }
        ]
      }
    ]
  }

export const handleSendChatMessage = async (message: string, context: string) => {
    let editableGoal = null, reply = 'No reply';
    try {
        if (context === 'Create New Goal') {
            editableGoal = mock_created_goal;
            reply = "New Goal Created";
        } else if (context === 'Update Goal') {
            editableGoal = mock_updated_goal;
            reply = "Goal Updated";
        }
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { reply, editableGoal };
    } catch (error) {
        console.error("Error in handleSendChatMessage:", error);
        return { reply: "Sorry, something went wrong.", editableGoal: null };
    }
}

