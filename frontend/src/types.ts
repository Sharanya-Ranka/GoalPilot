// --- Domain Enums (String Unions) ---

export type MetricType = "SUM" | "LATEST" | "BOOLEAN";
export type Cadence = "DAILY" | "WEEKLY" | "MONTHLY" | "ONCE";
export type SuccessLogicType = "STREAK" | "TOTAL_COUNT" | "ACHIEVED";

// --- Sub-Objects ---

export interface SuccessLogic {
  type: SuccessLogicType;
  count: number;
}

export interface Tracker {
  tracker_id: string;
  user_id: string;
  milestone_id: string;
  
  // Configuration
  metric_type: MetricType;
  unit: string;
  log_prompt: string;
  
  // [min, max] - null means open-ended (e.g. [10, null] means >= 10)
  target_range: [number | null, number | null];
  
  cadence: Cadence;
  window_days?: number | null;
  
  // Nested Logic
  success_logic: SuccessLogic;

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
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}