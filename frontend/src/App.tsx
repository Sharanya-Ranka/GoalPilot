import { useEffect, useState } from 'react';
import CreateUpdateGoal from './components/CreateUpdateGoal';
import ChatComponent from './components/ChatComponent'; 
import useTestStore from './store/useTestStore';
import LogProgress from './components/LogProgress';
import TodaysPlan from './components/TodaysPlan';
import { getUserGoals } from './commService';
// --- 1. Page Components ---
// In a real app, these would be in separate files (e.g., src/pages/TodaysPlan.tsx)
// const CreateUpdateGoal = () => (
//   <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
//     <h1 className="text-3xl font-bold text-gray-800 mb-6">Create / Update Goal 🎯</h1>
//     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//       <p className="text-gray-600">Goal configuration forms and settings will go here.</p>
//     </div>
//   </div>
// );

// const TodaysPlan = () => (
//   <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
//     <h1 className="text-3xl font-bold text-gray-800 mb-6">Today's Plan 📅</h1>
//     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//       <p className="text-gray-600">Your daily schedule and actionable tasks will go here.</p>
//     </div>
//   </div>
// );

// const LogProgress = () => (
//   <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
//     <h1 className="text-3xl font-bold text-gray-800 mb-6">Log Progress 📈</h1>
//     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//       <p className="text-gray-600">Your progress trackers and metric inputs will go here.</p>
//     </div>
//   </div>
// );

// --- 2. Main Application & Sidebar ---
export default function App() {
  // State to track which page is currently active
  const [activePage, setActivePage] = useState<string>('today');
  const setChatActiveState = useTestStore((state) => state.setChatActiveState);
  const setUserGoals = useTestStore((state) => state.setUserGoals);
  const userId = useTestStore((state) => state.userId);

  useEffect(() => {
    // 1. Define the async function inside the effect
    const fetchGoals = async () => {
      try {
        const userGoals = await getUserGoals(userId);
        setUserGoals(userGoals);
      } catch (error) {
        // It's always a good idea to handle potential network errors
        console.error("Failed to fetch user goals:", error);
      }
    };

    // 2. Call the function immediately
    fetchGoals();

    // 3. Include any variables used inside the effect in the dependency array
  }, []);
  

  // Navigation configuration
  const navItems = [
    { id: 'create', label: 'Create/Update Goal', icon: '🎯' },
    { id: 'today', label: "Today's Plan", icon: '📅' },
    { id: 'log', label: 'Log Progress', icon: '📈' },
  ];

  // Router logic to render the correct component
  const renderContent = () => {
    switch (activePage) {
      case 'create':
        return <CreateUpdateGoal />;
      case 'today':
        return <TodaysPlan />;
      case 'log':
        return <LogProgress />;
      default:
        return <TodaysPlan />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Sidebar Drawer 
        - Collapsed width: w-16 (64px)
        - Expanded width: w-64 (256px) on hover
        - 'group' class allows child elements to react when the parent is hovered
        - 'z-50' ensures it floats above main content like a modal
      */}
      <nav
        className="fixed top-0 left-0 h-full bg-slate-900 text-white shadow-2xl 
                   transition-all duration-300 ease-in-out z-50 
                   w-16 hover:w-64 group overflow-hidden"
      >
        <div className="flex flex-col h-full py-6">
          
          {/* Header / Logo Area */}
          <div className="px-4 mb-8 flex items-center whitespace-nowrap">
            <div className="w-8 flex justify-center flex-shrink-0">
              <span className="text-2xl">🚀</span>
            </div>
            <span className="ml-4 text-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              GoalTracker
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-2 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {setActivePage(item.id); setChatActiveState(false);}}
                className={`w-full flex items-center px-2 py-3 rounded-lg transition-colors whitespace-nowrap outline-none
                  ${activePage === item.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <div className="w-8 flex justify-center flex-shrink-0">
                  <span className="text-xl">{item.icon}</span>
                </div>
                {/* Text hides when collapsed, fades in when parent is hovered */}
                <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          
        </div>
      </nav>

      {/* Main Content Area
        - ml-16 gives it a 64px left margin so it isn't hidden behind the collapsed sidebar.
        - Because the sidebar is 'fixed', when it expands to w-64, it will just float over this content.
      */}
      <main className="flex-1 ml-16 min-h-screen">
        {renderContent()}
      </main>

      <ChatComponent />
      
    </div>
  );
}