import { useState, useRef, useEffect } from 'react';
import EditableGoal from './EditableGoal';
import type { Goal } from '../types';
import { getEmptyGoal } from '../constants';
import useTestStore from '../store/useTestStore';
import { handleCreateGoal } from '../commService';


// --- Main Component ---
export default function CreateUpdateGoal() {
  
  const editableGoal = useTestStore((state) => state.editableGoal);
  const setEditableGoal = useTestStore((state) => state.setEditableGoal);
  const userGoals = useTestStore((state) => state.userGoals);
  const setUserGoals = useTestStore((state) => state.setUserGoals);
  const userId = useTestStore((state) => state.userId);
  const setChatContext = useTestStore((state) => state.setChatContext);
  const setChatActiveState = useTestStore((state) => state.setChatActiveState);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'update'>('create');


  
  // Reference to handle clicking outside the dropdown to close it
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter goals based on user input
  const filteredGoals = userGoals.filter(goal => 
    goal.description.toLowerCase().includes(searchQuery.toLowerCase()) || goal.title.toLowerCase().includes(searchQuery.toLowerCase()) 
  );

  // Handle clicking outside to close the searchable dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateNew = () => {
    setEditableGoal(getEmptyGoal());
    setSearchQuery('');
    setMode('create');
  };

  const handleSelectGoal = (goal: Goal) => {
    setEditableGoal(goal);
    setSearchQuery(goal.description); // Update input to show selected goal
    setIsDropdownOpen(false);
    setChatActiveState(false);
    setMode('update');
  };

  const handleCreateUpdateWithAI = () => {
    setChatActiveState(true);
    const chatHeading = mode === 'create' ? 'Create New Goal' : 'Update Goal';
    setChatContext(chatHeading);
  };

  const handleOnSave = async () => {
    
    const newUserData = await handleCreateGoal(userId, editableGoal);
    setUserGoals(newUserData)
  }

  // console.log('Selected Goal:', editableGoal);

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-wrap items-center gap-3 text-2xl font-bold text-gray-800 mb-8">
        <span>Create</span>
        
        {/* Create (+) Button */}
        <button 
          onClick={handleCreateNew}
          className="flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title="Create New Goal"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <span>or Update</span>
        
        {/* Searchable Dropdown */}
        <div className="relative inline-block w-72 text-base font-normal" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search existing goals..."
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-colors shadow-sm text-slate-700 placeholder-slate-400"
            />
            {/* Search Icon */}
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
              {filteredGoals.length > 0 ? (
                <ul className="py-2">
                  {filteredGoals.map((goal) => (
                    <li key={goal.id}>
                      <button
                        onClick={() => handleSelectGoal(goal)}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors focus:bg-indigo-50 outline-none"
                      >
                        <div className="font-medium">{goal.title}</div>
                        {goal.description && (
                          <div className="text-sm text-gray-500 truncate">{goal.description}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No goals found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        <span>a Goal</span>
      </div>

      {/* AI Action Button */}
      <div className="mb-6">
        <button 
          onClick={() => {handleCreateUpdateWithAI();}} 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
        >
          <span>✨</span> {mode === 'create' ? 'Create with AI' : 'Update with AI'}
        </button>
      </div>

      {/* Main Content Area */}
      
      <EditableGoal goalData={editableGoal} setGoalData={setEditableGoal}/>
      
      {/* Save Button Area */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleOnSave}
          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors"
        >
          Save Goal
        </button>
      </div>
      
    </div>
  );
}