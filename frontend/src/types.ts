


// ==========================================
// 1. Types & Interfaces
// ==========================================
export type AggregationStrategy = 'SUM' | 'MEAN' | 'MIN' | 'MAX' | 'ONE-TIME' | 'ALL';

export type Tracker  = {
  id: string;
  name: string;
  info: string;
  metric: string;
  aggregationStrategy: AggregationStrategy;
  targetMin: number | null;
  targetMax: number | null;
  windowNumDays: number;
  successCriteria: number;
}

export type Milestone  = {
  id: string;
  statement: string;
  trackers: Tracker[];
}

export type GoalData = {
  id: string;
  title: string;
  description: string;
  info: string;
  milestones: Milestone[];
}