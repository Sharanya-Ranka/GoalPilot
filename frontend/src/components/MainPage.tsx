import { useState, useEffect } from 'react';
import { Layout, Bell, Search } from 'lucide-react';
import GoalDashboard from './GoalDashboard';
import ChatWindow from './ChatWindow';
import type { Goal } from '../types';

export const MainPage = () => {
  // --- State ---
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Mock Data Loader (Simulating API fetch) ---
  useEffect(() => {
    // Simulating a DB Fetch
    const mockData: Goal[] = [
    {
      goal_id: "g-1",
      what: "Run my first Half-Marathon",
      when: "October 15, 2024",
      why: "To prove to myself I have the discipline to stick to a long-term plan.",
      milestones: [
        {
          milestone_id: "m-1",
          statement: "Build Base Aerobic Capacity",
          status: "completed",
          depends_on: [],
          trackers: [
            {
              tracker_id: "t-1",
              user_id: "u-1",
              milestone_id: "m-1",
              metric_type: "SUM",
              unit: "km",
              log_prompt: "Weekly Distance",
              target_range: [30, null],
              cadence: "WEEKLY",
              success_logic: { type: "STREAK", count: 4 },
              // --- NEW FIELDS ---
              // Sum of all logs below (32 + 35 + 31 + 34 = 132)
              current_value: 22, 
              logs: {
                "2024-01-07": 2,
                "2024-01-14": 5,
                "2024-01-21": 1,
                "2024-01-28": 4
              }
            }
          ]
        },
        {
          milestone_id: "m-2",
          statement: "Increase Lactate Threshold",
          status: "pending",
          depends_on: ["m-1"],
          trackers: [
            {
              tracker_id: "t-2",
              user_id: "u-1",
              milestone_id: "m-2",
              metric_type: "LATEST",
              unit: "bpm",
              log_prompt: "Resting Heart Rate",
              target_range: [null, 55],
              cadence: "DAILY",
              success_logic: { type: "ACHIEVED", count: 55 },
              // --- NEW FIELDS ---
              // The latest value (from 2024-02-14) is 54
              current_value: 54,
              logs: {
                "2024-02-10": 62,
                "2024-02-11": 59,
                "2024-02-12": 58,
                "2024-02-13": 55,
                "2024-02-14": 54
              }
            },
            {
              tracker_id: "t-3",
              user_id: "u-1",
              milestone_id: "m-2",
              metric_type: "BOOLEAN",
              unit: "session",
              log_prompt: "Tempo Run Completed",
              target_range: [1, 1],
              cadence: "WEEKLY",
              success_logic: { type: "TOTAL_COUNT", count: 8 },
              // --- NEW FIELDS ---
              // Boolean: 1 means "Done", 0 means "Not Done"
              current_value: 1,
              logs: {
                "2024-02-02": 1,
                "2024-02-09": 1,
                "2024-02-16": 0 
              }
            }
          ]
        }
      ]
    }
  ];

    setTimeout(() => {
      setGoals(mockData);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      
      {/* --- Top Navigation Bar --- */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Layout className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl text-gray-800 tracking-tight">LifeSync AI</span>
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
          <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-200">
            JD
          </div>
        </div>
      </header>

      {/* --- Main Content Area (Split View) --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT COLUMN: Dashboard (Scrollable) */}
        <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
          <div className="max-w-5xl mx-auto py-8 px-6">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl"></div>
                <div className="h-48 bg-gray-200 rounded-xl"></div>
              </div>
            ) : (
              <GoalDashboard goals={goals} />
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: Chat (Fixed/Sticky) */}
        <aside className="w-[400px] border-l border-gray-200 bg-white flex flex-col shadow-xl z-20 hidden lg:flex">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* NOTE: I am passing a wrapper style here. 
                Ideally, update ChatWindow to accept `className` or 
                remove its internal hardcoded height.
            */}
            <div className="h-full flex flex-col">
              <ChatWindow 
                threadId="thread_123" 
                initialMessages={[
                  {
                    id: 'welcome', 
                    role: 'agent', 
                    content: "Hello! I see you've completed your base training. Would you like to log your latest resting heart rate?", 
                    timestamp: new Date()
                  }
                ]}
              />
            </div>
          </div>
        </aside>

        {/* Mobile Toggle for Chat (Floating Action Button) */}
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