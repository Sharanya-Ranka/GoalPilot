import React, { useState, } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Edit2, Check, X
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
  onItemUpdate: (type: 'goal' | 'milestone' | 'tracker', id: string, payload: any) => void;
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
  onItemUpdate: (type: 'goal' | 'milestone' | 'tracker', id: string, payload: any) => void;
}
const MilestoneItem = ({ milestone, isOpen, onToggle, onLogSubmit, onItemUpdate }: MilestoneItemProps) => {
  // Local state for UI and Draft Data
  const [isEditing, setIsEditing] = useState(false);
  const [draftStatement, setDraftStatement] = useState(milestone.statement);

  // Intermediate handlers
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the accordion from toggling
    console.log("Saving to backend via intermediate handler:", draftStatement);
    onItemUpdate('milestone', milestone.milestone_id, { statement: draftStatement });
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftStatement(milestone.statement); // Reset draft
    setIsEditing(false);
  };

  const triggerEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // --- 1. VIEW HEADER ---
  const viewHeader = (
    <div 
      className="flex items-center justify-between mb-3 cursor-pointer group relative" 
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <div className="text-base font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
          {milestone.statement}
        </div>
        {/* Assuming StatusBadge is imported */}
        <StatusBadge status={milestone.status} />
        
        {/* Edit Button - Appears on Hover */}
        <button 
          onClick={triggerEdit}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-all ml-1 rounded"
          title="Edit Milestone"
        >
          <Edit2 size={14} />
        </button>
      </div>

      <div className="text-gray-400 group-hover:text-indigo-600">
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
    </div>
  );

  // --- 2. EDIT HEADER ---
  const editHeader = (
    <div className="flex items-center justify-between mb-3 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
      <div className="flex-1 mr-4">
        <input 
          className="w-full bg-white border border-indigo-200 text-gray-800 px-3 py-1.5 rounded text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          value={draftStatement}
          onChange={(e) => setDraftStatement(e.target.value)}
          placeholder="Milestone statement"
          onClick={(e) => e.stopPropagation()} // Prevent accidental toggling when clicking the input
          autoFocus
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button onClick={handleSave} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="Save">
          <Check size={16} />
        </button>
        <button onClick={handleCancel} className="p-1.5 bg-gray-200 text-gray-600 hover:bg-gray-300 rounded transition-colors" title="Cancel">
          <X size={16} />
        </button>
      </div>
    </div>
  );

  // --- 3. TRACKERS BODY ---
  const trackersBody = (
    <div className="grid grid-cols-1 gap-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
      {milestone.trackers && milestone.trackers.length > 0 ? (
        milestone.trackers.map((tracker) => (
          //  Assuming TrackerItem is imported
          <TrackerItem 
            key={tracker.tracker_id} 
            tracker={tracker} 
            onLogSubmit={onLogSubmit}
            onItemUpdate={onItemUpdate}
          />
        ))
      ) : (
        <div className="col-span-full text-xs text-gray-400 italic flex items-center gap-1 p-2 bg-gray-50 rounded border border-dashed border-gray-200">
          <AlertCircle size={12} /> No trackers set up for this milestone.
        </div>
      )}
    </div>
  );

  // --- COMPONENT RENDER ---
  return (
    <div className="border-l-2 border-indigo-200 pl-4 ml-2 pb-6 last:pb-0 transition-all duration-200">
      {isEditing ? editHeader : viewHeader}
      {/* If editing, we keep the trackers open so the user doesn't lose context */}
      {(isOpen || isEditing) && trackersBody}
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
  onItemUpdate: (type: 'goal' | 'milestone' | 'tracker', id: string, payload: any) => void;
}

const GoalCard = ({ goal, isOpen, onToggle, uiState, toggleHandler, onLogSubmit, onItemUpdate }: GoalCardProps) => {
  // Local state for UI and Draft Data
  const [isEditing, setIsEditing] = useState(false);
  const [draftGoal, setDraftGoal] = useState({ what: goal.what, when: goal.when, why: goal.why });

  // Intermediate handlers
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the accordion from toggling
    console.log("Saving to backend via intermediate handler:", draftGoal);
    await onItemUpdate('goal', goal.goal_id, draftGoal);
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftGoal({ what: goal.what, when: goal.when, why: goal.why }); // Reset draft
    setIsEditing(false);
  };

  const triggerEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle when clicking edit button
    setIsEditing(true);
  };

  // --- 1. VIEW HEADER ---
  const viewHeader = (
    <div 
      className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white cursor-pointer select-none group relative"
      onClick={onToggle}
    >
      {/* Edit Button - Appears on Hover */}
      <button 
        onClick={triggerEdit}
        className="absolute top-4 right-14 bg-white/20 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
        title="Edit Goal"
      >
        <Edit2 size={16} />
      </button>

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
        
        {/* Chevron */}
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
  );

  // --- 2. EDIT HEADER ---
  const editHeader = (
    <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-white border-b-4 border-indigo-400">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <input 
            className="w-full bg-white/10 border border-white/30 text-white placeholder-indigo-200 px-3 py-2 rounded text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
            value={draftGoal.what}
            onChange={(e) => setDraftGoal({...draftGoal, what: e.target.value})}
            placeholder="Goal Title"
          />
          <div className="flex items-center gap-2">
            <Target size={14} className="text-indigo-200" />
            <input 
              type="date"
              className="bg-white/10 border border-white/30 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              value={draftGoal.when}
              onChange={(e) => setDraftGoal({...draftGoal, when: e.target.value})}
            />
          </div>
          <textarea 
            className="w-full bg-white/10 border border-white/30 text-white placeholder-indigo-200 px-3 py-2 rounded text-sm italic focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
            value={draftGoal.why}
            onChange={(e) => setDraftGoal({...draftGoal, why: e.target.value})}
            placeholder="Why is this important?"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 p-2 rounded text-white transition-colors" title="Save">
            <Check size={20} />
          </button>
          <button onClick={handleCancel} className="bg-white/20 hover:bg-white/30 p-2 rounded text-white transition-colors" title="Cancel">
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  // --- 3. MILESTONES BODY ---
  const milestonesBody = (
    <div className="p-6">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Milestones Roadmap</h3>
      <div className="space-y-2">
        {goal.milestones && goal.milestones.length > 0 ? (
          goal.milestones.map((milestone) => (
            // * Assuming MilestoneItem is imported and defined elsewhere *
            <MilestoneItem 
              key={milestone.milestone_id} 
              milestone={milestone}
              isOpen={uiState.expandedMilestones.includes(milestone.milestone_id)}
              onToggle={() => toggleHandler('milestone', milestone.milestone_id)}
              onLogSubmit={onLogSubmit}
              onItemUpdate={onItemUpdate}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">No milestones defined yet.</div>
        )}
      </div>
    </div>
  );

  // --- COMPONENT RENDER ---
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
      {isEditing ? editHeader : viewHeader}
      {(isOpen || isEditing) && milestonesBody}
    </div>
  );
};
// --- Main Container ---

export const GoalDashboard: React.FC<GoalDashboardProps> = ({ 
  goals, 
  uiState, 
  onToggle, 
  onLogSubmit,
  onItemUpdate
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
    <div className="w-full mx-auto p-1 md:p-8 bg-gray-50 min-h-screen">
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
          onItemUpdate={onItemUpdate}
        />
      ))}
    </div>
  );
};

export default GoalDashboard;