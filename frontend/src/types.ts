// --- Domain Enums (String Unions) ---

export type MetricType = "SUM" | "ALL" | "MIN" | "MAX" | "MEAN" | "ONE-TIME";

// --- Sub-Objects ---

export interface Tracker {
  tracker_id: string;
  user_id: string;
  milestone_id: string;
  
  // Configuration
  log_prompt: string;
  unit: string;
  aggregation_strategy: MetricType;
  // [min, max] - null means open-ended (e.g. [10, null] means >= 10)
  target_range: [number | null, number | null];
  window_num_days?: number | null;
  num_windows_to_completion?: number | null;

  current_value: number; 
  logs: Record<string, number>; // { "2024-01-20": 15, "2024-01-21": 10 }
}

export interface Milestone {
  milestone_id: string;
  user_id?: string; // Optional if not always sent by specific API views
//   goal_id: string;
  
  statement: string;
  status: "pending" | "completed" | "archived" | string;
  depends_on: string[];
  
  // Injected by the "Super Read" DB handler
  trackers: Tracker[]; 
}

export interface Goal {
  goal_id: string;
//   user_id: string;
  
  what: string;
  when: string;
  why: string;
  
  // Injected by the "Super Read" DB handler
  milestones: Milestone[];
}

// --- Chat Specific Types ---

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: Date;
}

export interface ChatMessageComm{
  agent: string;
  message: string;
}