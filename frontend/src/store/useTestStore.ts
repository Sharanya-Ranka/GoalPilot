import { create } from 'zustand';
import type { GoalData } from '../types';
import { emptyGoal, mockGoals } from '../constants';

// 1. Define the shape of our state
interface TestState {
  chatIsActive: boolean;
  chatContext: string;
  editableGoal: GoalData;
  userGoals: GoalData[];

  setChatActiveState: (state: boolean) => void;
  setEditableGoal: (goal: GoalData) => void;
  setChatContext: (context: string) => void;
}

// 2. Create the hook
const useTestStore = create<TestState>((set) => ({
  chatIsActive: false,
  chatContext: "None",
  editableGoal: emptyGoal,
  userGoals: mockGoals,

  setChatActiveState: (state) => set({chatIsActive: state}),
  setEditableGoal: (goal) => set({editableGoal: goal}),
  setChatContext: (context) => set({chatContext: context}),
}));

export default useTestStore;