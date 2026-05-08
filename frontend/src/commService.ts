import type { Goal, Log} from "./types"

const SERVER_URL = "http://localhost:8000"; 

export const handleSendChatMessage = async (message: string, context: string, thread_id: string) => {
    try {
        const response = await fetch(`${SERVER_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                thread_id: thread_id
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Response received:", data)

        const reply = data.response ? data.response : "No reply";

        // 2. Extract the structured goal (if populated by the agent graph)
        const editableGoal = data.structured_data?.goal_structured || null;

        return { reply, editableGoal };

    } catch (error) {
        console.error("Error in handleSendChatMessage:", error);
        return { reply: "Sorry, something went wrong connecting to the server.", editableGoal: null };
    }
}


export const handleCreateGoal = async (user_id: string, goal: Goal): Promise<Goal[]> => {
    try {
        const request = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                goal: goal,
                user_id: user_id,
            })
        }
        console.log('Making request (createGoal) with', request)
        const response = await fetch(`${SERVER_URL}/goals/`, request);

        if (!response.ok) {
            // Read the error body sent by FastAPI
            const errorData = await response.json();
            console.error("FastAPI Validation Error:", JSON.stringify(errorData, null, 2));
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newUserData = await response.json() as Goal[];

        console.log("(handleCreateGoal) Response received (NewUserData):", newUserData)
        return newUserData ;

    } catch (error) {
        console.error("Error in handleCreateGoal:", error);
        return [];
    }
}



export const handleCreateLog = async (user_id: string, tracker_id:string, log: Log) :Promise<Goal[]>  => {
    try {
        const request = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                log: log,
                user_id: user_id,
                tracker_id: tracker_id,
            })
        }
        console.log('Making request (createLog) with', request)
        const response = await fetch(`${SERVER_URL}/logs/`, request);

        if (!response.ok) {
            // Read the error body sent by FastAPI
            const errorData = await response.json();
            console.error("FastAPI Validation Error:", JSON.stringify(errorData, null, 2));
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newUserData = await response.json() as Goal[];

        console.log("(handleCreateLog) Response received (NewUserData):", newUserData)
        return newUserData

    } catch (error) {
        console.error("Error in handleCreateLog:", error);
        return []
    }
}


export const getUserGoals = async (user_id: string): Promise<Goal[]>  => {
    try {
        const request = {
            method: 'GET'
        }
        console.log('Making request (getUserGoals) with', request)
        const response = await fetch(`${SERVER_URL}/goals/${user_id}`, request);

        if (!response.ok) {
            // Read the error body sent by FastAPI
            const errorData = await response.json();
            console.error("FastAPI Validation Error:", JSON.stringify(errorData, null, 2));
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newUserData = await response.json() as Goal[];

        console.log("(getUserGoals) Response received (NewUserData):", newUserData)
        return newUserData

    } catch (error) {
        console.error("Error in getUserGoals:", error);
        return []
    }
}