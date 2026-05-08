// ==========================================
// 1. Types & Interfaces
// ==========================================
export type AggregationStrategy = 'SUM' | 'MEAN' | 'MIN' | 'MAX' | 'ONE-TIME' | 'ALL';

export type Log = {
  date: string;
  value: number;
  log_message?: string;
}

export type Tracker  = {
  id: string;
  name_id?: string;
  name: string;
  info: string;
  metric: string;
  strategy: AggregationStrategy;
  target: [number | null, number | null]; // [min, max]
  window: number;
  success_criteria: number;
  logs: Log[]
}

export type Milestone  = {
  id: string;
  name_id?: string;
  statement: string;
  trackers: Tracker[];
}

export type Goal = {
  id: string;
  name_id?: string;
  title: string;
  description: string;
  milestones: Milestone[];
}

export type AllGoals = {
  goals: Goal[]
}