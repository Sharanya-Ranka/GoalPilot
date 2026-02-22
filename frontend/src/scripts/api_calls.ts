import type { Goal, ChatMessageComm } from '../types';

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000"; // Change this for production

// --- ENDPOINTS ---
const ENDPOINTS = {
  GET_USER_STATE: (userId: string) => `${API_BASE_URL}/dashboard/${userId}`,
  LOG_ENTRY: `${API_BASE_URL}/logs`,
  CHAT: `${API_BASE_URL}/ai/chat`,
  GET_CHAT_HISTORY: (userId: string) => `${API_BASE_URL}/ai/chat/${userId}`
};

// const DUMMY_RESPONSE = {ok:true, statusText:"Allgood"};

// --- API FUNCTIONS ---

/**
 * Fetches the complete tree of goals, milestones, and trackers for a user.
 */
export const fetchUserGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const response = await fetch(ENDPOINTS.GET_USER_STATE(userId)); //DUMMY_RESPONSE; //
    console.log(userId)
    if (!response.ok) {
      throw new Error(`Error fetching goals: ${response.statusText}`);
    }

    const data = await response.json();
    // const data_str = '{"goals":[{"user_id":"user_11","goal_id":"qEXa","what":"TestGoal","when":"Eternity","why":"Why not?","milestones":[{"user_id":"user_11","goal_id":"qEXa","milestone_id":"4E8Y","statement":"Test Milestone 1","status":"active","depends_on":[],"trackers":[{"user_id":"user_11","milestone_id":"4E8Y","tracker_id":"tL4c","metric_type":"SUM","unit":"km","log_prompt":"How many total km did you run today?","target_range":["30",null],"cadence":"DAILY","window_days":10,"success_logic":{"type":"TOTAL_COUNT","count":10},"current_value":"19","last_log_date":"2026-01-08T00:00:00"}]},{"user_id":"user_11","goal_id":"qEXa","milestone_id":"Ghq6","statement":"Test Milestone 2","status":"pending","depends_on":["4E8Y"],"trackers":[{"user_id":"user_11","milestone_id":"Ghq6","tracker_id":"M9cS","metric_type":"BOOLEAN","unit":"","log_prompt":"Incorporated company?","target_range":["1","1"],"cadence":"DAILY","window_days":10,"success_logic":{"type":"ACHIEVED","count":10},"current_value":"1","last_log_date":"2026-01-08T00:00:00"},{"user_id":"user_11","milestone_id":"Ghq6","tracker_id":"ojtB","metric_type":"LATEST","unit":"kg","log_prompt":"Weight today?","target_range":["55","65"],"cadence":"DAILY","window_days":10,"success_logic":{"type":"STREAK","count":10},"current_value":"60","last_log_date":"2026-01-08T00:00:00"}]}]}]}'
    // const data = JSON.parse(data_str)
    // console.log(JSON.stringify(data))
    // Assuming the API returns { goals: [...] }
    return data.goals || []; 
  } catch (error) {
    console.error("API Call Failed: fetchUserGoals", error);
    throw error; // Re-throw so the UI can handle the error state
  }
};

/**
 * Submits a new log entry for a specific tracker.
 */
export const submitLogEntry = async (
  userId: string, 
  trackerId: string, 
  value: number, 
  date: string // Format: YYYY-MM-DD
): Promise<void> => {
  try {
    const payload = {
      user_id: userId,
      tracker_id: trackerId,
      value: value,
      timestamp: new Date(date).toISOString() // Convert "2024-01-01" to full ISO string
    };

    const response = await fetch(ENDPOINTS.LOG_ENTRY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error submitting log: ${response.statusText}`);
    }

    // We don't need to return data, just ensure it succeeded
    return;
  } catch (error) {
    console.error("API Call Failed: submitLogEntry", error);
    throw error;
  }
};



export const getChatHistory = async (threadId: string): Promise<{messages: Array<ChatMessageComm>}> => {
  try {

    const response = await fetch(ENDPOINTS.GET_CHAT_HISTORY(threadId))

    if (!response.ok) {
      throw new Error(`Error sending message: ${response.statusText}`);
    }

    const data = await response.json();

    
    // Normalize the response. 
    // If server returns { "response": "Hello" }, map it to { message: "Hello" }
    return {
      messages: data.messages || [data.error] || ["No response content received."]
    };

  } catch (error) {
    console.error("API Call Failed: getChatHistory", error);
    throw error;
  }
}
/**
 * Sends a message to the AI Agent and returns the response.
 */
export const sendChatMessage = async (
  message: string, 
  threadId: string
): Promise<{ responses: Array<ChatMessageComm> }> => {
  try {
    const payload = {
      message: message,
      thread_id: threadId
    };
    console.log(payload)

    // const response = {ok:true, statusText:"Allgood"}
    const response = await fetch(ENDPOINTS.CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error sending message: ${response.statusText}`);
    }

    const data = await response.json();
    // const data_str = '{"response":[{"agent":"orchestrator","message":"Hi there! I’m the Goal Architect Receptionist — ready to help. What would you like to do today? Pick one: 1) Start a new goal, 2) Create milestones for an existing goal, 3) Get a motivation/check-in, 4) Plan my day, 5) Log or review progress. If you already mean a specific goal, you can mention its name (e.g., TestGoal)."}],"thread_id":"user_11"}'
    // const data = JSON.parse(data_str)
    console.log(JSON.stringify(data))
    
    // Normalize the response. 
    // If server returns { "response": "Hello" }, map it to { message: "Hello" }
    return {
      responses: data.response || [data.error] || ["No response content received."]
    };

  } catch (error) {
    console.error("API Call Failed: sendChatMessage", error);
    throw error;
  }
};