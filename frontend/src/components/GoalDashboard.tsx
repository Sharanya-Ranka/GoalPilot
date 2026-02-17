import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  ChevronDown, 
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import type { Goal, Milestone} from '../types';
import { TrackerItem } from './Tracker';

interface GoalDashboardProps {
  goals: Goal[];
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

// const SuccessLogicDisplay = ({ logic }: { logic: SuccessLogic }) => {
//   const getIcon = () => {
//     switch (logic.type) {
//       case 'STREAK': return <TrendingUp size={14} className="text-orange-500" />;
//       case 'TOTAL_COUNT': return <Activity size={14} className="text-blue-500" />;
//       case 'ACHIEVED': return <Target size={14} className="text-green-500" />;
//       default: return <Circle size={14} />;
//     }
//   };

//   const getText = () => {
//     switch (logic.type) {
//       case 'STREAK': return `${logic.count} Streak Target`;
//       case 'TOTAL_COUNT': return `${logic.count} Total Count`;
//       case 'ACHIEVED': return `Reach ${logic.count}`;
//       default: return '';
//     }
//   };

//   return (
//     <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
//       {getIcon()}
//       <span>{getText()}</span>
//     </div>
//   );
// };

// --- Sub-Components ---

// const TrackerItem = ({ tracker }: { tracker: Tracker }) => {
//   const min = tracker.target_range[0];
//   const max = tracker.target_range[1];
  
//   let rangeText = "";
//   if (min !== null && max !== null) rangeText = `${min} - ${max}`;
//   else if (min !== null) rangeText = `> ${min}`;
//   else if (max !== null) rangeText = `< ${max}`;

//   return (
//     <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
//       <div className="flex justify-between items-start">
//         <div className="flex flex-col">
//           <span className="text-sm font-semibold text-gray-800">{tracker.log_prompt}</span>
//           <span className="text-xs text-gray-500 flex items-center gap-1">
//             <Calendar size={10} />
//             {tracker.cadence} • {tracker.metric_type}
//           </span>
//         </div>
//         <SuccessLogicDisplay logic={tracker.success_logic} />
//       </div>

//       <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
//         <div className="text-xs text-gray-500">
//           Target: <span className="font-mono text-gray-700 font-medium">{rangeText || "Any"} {tracker.unit}</span>
//         </div>
//         {/* Placeholder for an Action Button (e.g., "Log Now") */}
//         <button className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
//           Log Entry
//         </button>
//       </div>
//     </div>
//   );
// };

const MilestoneItem = ({ milestone }: { milestone: Milestone }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-l-2 border-indigo-200 pl-4 ml-2 pb-6 last:pb-0">
      <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-gray-800">{milestone.statement}</div>
          <StatusBadge status={milestone.status} />
        </div>
        <div className="text-gray-400 hover:text-gray-600">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 gap-3 mt-2">
          {milestone.trackers && milestone.trackers.length > 0 ? (
            milestone.trackers.map((tracker) => (
              <TrackerItem key={tracker.tracker_id} tracker={tracker} onLogSubmit={async () => {}}/>
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

const GoalCard = ({ goal }: { goal: Goal }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      {/* Goal Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{goal.what}</h2>
            <p className="text-indigo-100 text-sm mt-1 flex items-center gap-1">
              <Target size={14} /> 
              Deadline: {goal.when}
            </p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
          <p className="text-sm italic">"{goal.why}"</p>
        </div>
      </div>

      {/* Goal Body (Milestones) */}
      <div className="p-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Milestones Roadmap</h3>
        <div className="space-y-2">
          {goal.milestones && goal.milestones.length > 0 ? (
            goal.milestones.map((milestone) => (
              <MilestoneItem key={milestone.milestone_id} milestone={milestone} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">No milestones defined yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Container ---

export const GoalDashboard: React.FC<GoalDashboardProps> = ({ goals }) => {
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
        <GoalCard key={goal.goal_id} goal={goal} />
      ))}
    </div>
  );
};

export default GoalDashboard;