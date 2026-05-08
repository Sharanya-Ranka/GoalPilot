import { create } from 'zustand';
import type { Goal } from '../types';
import { getEmptyGoal, mockGoals } from '../constants';
import { getUserGoals } from "../commService"

// 1. Define the shape of our state
interface TestState {
  chatIsActive: boolean;
  chatContext: string;
  editableGoal: Goal;
  userGoals: Goal[];
  userId: string;
  userThreadId: string;

  setChatActiveState: (state: boolean) => void;
  setEditableGoal: (goal: Goal) => void;
  setChatContext: (context: string) => void;
  setUserGoals: (goals: Goal[]) => void,
}

// 2. Create the hook
const useTestStore = create<TestState>((set) => {
  const initialUserId = "user15";
  return {
    chatIsActive: false,
    chatContext: "None",
    editableGoal: getEmptyGoal(),
    userId: initialUserId,
    userGoals: [],
    userThreadId: 'user15_th1',

    setChatActiveState: (state) => set({chatIsActive: state}),
    setEditableGoal: (goal) => set({editableGoal: goal}),
    setChatContext: (context) => set({chatContext: context}),
    setUserGoals: (goals) => set({userGoals: goals}),
  };
}
);

export default useTestStore;