import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  ChevronDown, 
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import type { Goal, Milestone } from '../types';
import { TrackerItem } from './Tracker';

// --- New State Interface ---
// This defines the "snapshot" of the UI that the Parent must maintain
export interface DashboardUiState {
  expandedGoals: string[];      // IDs of goals that are open
  expandedMilestones: string[]; // IDs of milestones that are open
}

interface GoalDashboardProps {
  goals: Goal[];
  uiState: DashboardUiState;
  // One handler for both types to keep props clean
  onToggle: (type: 'goal' | 'milestone', id: string) => void;
  // The log submit handler now passes through from the top
  onLogSubmit: (trackerId: string, value: number, date: string) => Promise<void>;
}

// --- Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const isCompleted = status.toLowerCase() === 'completed';
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {isCompleted ? <CheckCircle2 size={12} /> : <Circle size={12} />}
      {status.toUpperCase()}
    </span>
  );
};

// --- Milestone Item (Stateless) ---

interface MilestoneItemProps {
  milestone: Milestone;
  isOpen: boolean;
  onToggle: () => void;
  onLogSubmit: (trackerId: string, value: number, date: string) => Promise<void>;
}

const MilestoneItem = ({ milestone, isOpen, onToggle, onLogSubmit }: MilestoneItemProps) => {
  console.log(JSON.stringify(milestone))
  return (
    <div className="border-l-2 border-indigo-200 pl-4 ml-2 pb-6 last:pb-0">
      <div 
        className="flex items-center justify-between mb-3 cursor-pointer group" 
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
            {milestone.statement}
          </div>
          <StatusBadge status={milestone.status} />
        </div>
        <div className="text-gray-400 group-hover:text-indigo-600">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 gap-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {milestone.trackers && milestone.trackers.length > 0 ? (
            milestone.trackers.map((tracker) => (
              <TrackerItem 
                key={tracker.tracker_id} 
                tracker={tracker} 
                onLogSubmit={onLogSubmit}
              />
            ))
          ) : (
            <div className="col-span-full text-xs text-gray-400 italic flex items-center gap-1">
              <AlertCircle size={12} /> No trackers set up for this milestone.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Goal Card (Stateless) ---

interface GoalCardProps {
  goal: Goal;
  isOpen: boolean;
  onToggle: () => void;
  uiState: DashboardUiState;
  toggleHandler: (type: 'goal' | 'milestone', id: string) => void;
  onLogSubmit: (trackerId: string, value: number, date: string) => Promise<void>;
}

const GoalCard = ({ goal, isOpen, onToggle, uiState, toggleHandler, onLogSubmit }: GoalCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      
      {/* Goal Header (Clickable for Expand/Collapse) */}
      <div 
        className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {goal.what}
            </h2>
            <p className="text-indigo-100 text-sm mt-1 flex items-center gap-1">
              <Target size={14} /> 
              Deadline: {goal.when}
            </p>
          </div>
          {/* Chevron for Goal */}
          <div className="bg-white/10 p-1 rounded hover:bg-white/20 transition-colors">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {isOpen && (
          <div className="mt-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10 animate-in fade-in duration-300">
            <p className="text-sm italic">"{goal.why}"</p>
          </div>
        )}
      </div>

      {/* Goal Body (Milestones) */}
      {isOpen && (
        <div className="p-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Milestones Roadmap</h3>
          <div className="space-y-2">
            {goal.milestones && goal.milestones.length > 0 ? (
              goal.milestones.map((milestone) => (
                <MilestoneItem 
                  key={milestone.milestone_id} 
                  milestone={milestone}
                  // Check if this specific milestone is in the "expanded" list
                  isOpen={uiState.expandedMilestones.includes(milestone.milestone_id)}
                  onToggle={() => toggleHandler('milestone', milestone.milestone_id)}
                  onLogSubmit={onLogSubmit}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No milestones defined yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Container ---

export const GoalDashboard: React.FC<GoalDashboardProps> = ({ 
  goals, 
  uiState, 
  onToggle, 
  onLogSubmit 
}) => {
  
  if (!goals || goals.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Target size={48} className="mx-auto mb-4 text-gray-300" />
        <p>No goals found. Start by creating one!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Goals</h1>
      {goals.map((goal) => (
        <GoalCard 
          key={goal.goal_id} 
          goal={goal}
          // Check if this specific goal is in the "expanded" list
          isOpen={uiState.expandedGoals.includes(goal.goal_id)}
          onToggle={() => onToggle('goal', goal.goal_id)}
          uiState={uiState} // Pass full state down for milestones
          toggleHandler={onToggle} // Pass handler down
          onLogSubmit={onLogSubmit}
        />
      ))}
    </div>
  );
};

export default GoalDashboard;