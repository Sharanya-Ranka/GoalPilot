import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Components ---
import GoalDashboard from './GoalDashboard';
import type { DashboardUiState } from './GoalDashboard';
import ChatWindow from './ChatWindow';

// --- Types ---
import type { Goal, ChatMessage, } from '../types';

// --- API Layer (Hypothetical Import) ---
// We assume these functions exist in your scripts folder
import { 
  fetchUserGoals, 
  submitLogEntry, 
  sendChatMessage,
  updateItem
} from '../scripts/api_calls';

// Hardcoded constants for now (could come from Auth Context later)
const USER_ID = "user_17";
const THREAD_ID = USER_ID;

export const MainPage = () => {
  // -------------------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // -------------------------------------------------------------------------
  
  // A. Data State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);

  // B. Dashboard UI State (Preserves Open/Closed folders across refreshes)
  const [uiState, setUiState] = useState<DashboardUiState>({
    expandedGoals: [],
    expandedMilestones: []
  });

  // C. Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: "Hello! I'm ready to help you update your trackers.",
      timestamp: new Date()
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // 2. DATA FETCHING & REFRESHING
  // -------------------------------------------------------------------------

  const loadGoals = useCallback(async () => {
    try {
      // API CALL: Fetch the full tree
      const data = await fetchUserGoals(USER_ID);
      setGoals(data);
      
      // OPTIONAL: On first load, if UI state is empty, expand the first goal
      setUiState(prev => {
        if (prev.expandedGoals.length === 0 && data.length > 0) {
          return { ...prev, expandedGoals: [data[0].goal_id] };
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load goals", error);
    } finally {
      setIsLoadingGoals(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // -------------------------------------------------------------------------
  // 3. HANDLERS (The "Controller" Logic)
  // -------------------------------------------------------------------------

  // --- Dashboard: Toggle Folders ---
  const handleToggle = (type: 'goal' | 'milestone', id: string) => {
    setUiState(prev => {
      const listKey = type === 'goal' ? 'expandedGoals' : 'expandedMilestones';
      const currentList = prev[listKey];
      
      const newList = currentList.includes(id)
        ? currentList.filter(itemId => itemId !== id) // Close
        : [...currentList, id];                       // Open

      return { ...prev, [listKey]: newList };
    });
  };

  const handleItemUpdate = async (type: 'goal'| 'milestone' | 'tracker', id: string, payload: any) => {
    try {
      // 1. API CALL: Send the ID and payload to the backend
      await updateItem(type, id, payload);
      
      // 2. Refresh Data (re-fetches the tree so the UI reflects the updated state)
      await loadGoals();
      
      console.log(`${type} successfully updated.`);
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
      alert(`Failed to update the ${type}. Please try again.`);
    }
  };

  // --- Dashboard: Submit Log ---
  const handleLogSubmit = async (trackerId: string, value: number, date: string) => {
    try {
      // 1. API CALL: Send data to server
      await submitLogEntry(USER_ID, trackerId, value, date);
      
      // 2. Refresh Data (This updates the 'goals' prop, but 'uiState' stays same)
      await loadGoals();
      
      console.log("Log saved and dashboard refreshed");
    } catch (error) {
      console.error("Failed to log entry", error);
      alert("Failed to save log. Please try again.");
    }
  };


  // --- Chat: Send Message ---
  const handleSendMessage = async (text: string) => {
    setChatError(null);
    setIsChatLoading(true);

    // 1. Optimistic Update (Show user message immediately)
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newUserMsg]);

    try {
      // 2. API CALL: Send to AI
      const response = await sendChatMessage(text, THREAD_ID);
      
      // 3. Update with Agent Response
      const newAgentMsgs: ChatMessage[] = response.responses.map(({agent, message}, index) => ({
        // Adding index to Date.now() ensures unique IDs even if generated in the same millisecond
        id: (Date.now() + index + 1).toString(), 
        role: agent, 
        content: message,
        timestamp: new Date()
      }));
      console.log(newAgentMsgs)
      setChatMessages(prev => [...prev, ...newAgentMsgs]);

    } catch (err) {
      console.error(err);
      setChatError("Unable to reach the assistant.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. RENDER
  // -------------------------------------------------------------------------
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      
      {/* --- Header --- */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Layout className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl text-gray-800 tracking-tight hidden md:inline">GoalPilot</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search goals..." 
              className="pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-200 cursor-pointer">
            JD
          </div>
        </div>
      </header>

      {/* --- Split View Content --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT: Dashboard (Scrollable) */}
        <main className="flex flex-1 overflow-y-auto scroll-smooth custom-scrollbar bg-gray-50">
          <div className="w-full mx-auto py-6 px-1 md:px-8">
            {isLoadingGoals ? (
              <div className="space-y-4 animate-pulse mt-8">
                <div className="h-48 bg-gray-200 rounded-xl"></div>
                <div className="h-48 bg-gray-200 rounded-xl"></div>
              </div>
            ) : (
              <GoalDashboard 
                goals={goals}
                uiState={uiState}
                onToggle={handleToggle}
                onLogSubmit={handleLogSubmit}
                onItemUpdate={handleItemUpdate}
              />
            )}
          </div>
        </main>

        {/* RIGHT: Chat Container with Flap */}
        <div 
          className={`relative hidden md:flex transition-all duration-300 ease-in-out ${
            isChatOpen ? 'w-[600px]' : 'w-0'
          }`}
        >
          {/* The Flap Toggle Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-16 bg-white border-y border-l border-gray-200 shadow-[-3px_0_5px_-2px_rgba(0,0,0,0.1)] rounded-l-lg flex items-center justify-center z-30 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
            title={isChatOpen ? "Hide Chat" : "Show Chat"}
          >
            {isChatOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* The Chat Content */}
          {/* min-w-[400px] prevents the content from squishing during animation */}
          <aside className="flex-1 w-full min-w-[400px] border-l border-gray-200 bg-white flex flex-col shadow-xl z-20 overflow-hidden">
            <ChatWindow 
              messages={chatMessages}
              isLoading={isChatLoading}
              error={chatError}
              onSendMessage={handleSendMessage}
            />
          </aside>
        </div>

        {/* Mobile Chat FAB (Floating Action Button) */}
        <button className="lg:hidden fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 z-50">
          <div className="relative">
            <Layout size={24} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </button>

      </div>
    </div>
  );
};

export default MainPage;