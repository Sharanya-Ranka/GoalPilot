import { useState } from 'react';
import type { GoalData, Milestone, Tracker } from '../types';
import { mockGoals } from '../constants';

// --- Types ---
export interface LogEntry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  message?: string;
}

// Flattened structure to make rendering the list easier
interface FlattenedTracker {
  goal: GoalData;
  milestone: Milestone;
  tracker: Tracker;
}

// --- Log Card Component ---
interface LogCardProps {
  data: FlattenedTracker;
  isFocused: boolean;
  onFocus: () => void;
  onSave: (log: Omit<LogEntry, 'id' | 'trackerId'>) => void;
}

const LogCard = ({ data, isFocused, onFocus, onSave }: LogCardProps) => {
  const { goal, milestone, tracker } = data;
  const [showInfo, setShowInfo] = useState(false);
  
  // Form State
  const [logValue, setLogValue] = useState<number | ''>('');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logMessage, setLogMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (logValue === '') return;
    
    onSave({
      date: logDate,
      value: Number(logValue),
      message: logMessage.trim() || undefined
    });

    // Reset form after saving
    setLogValue('');
    setLogMessage('');
    // Optional: Could unfocus here, or keep open
  };

  return (
    <div 
      onClick={onFocus}
      className={`
        bg-white border rounded-xl p-5 cursor-pointer transition-all duration-300 ease-in-out
        ${isFocused ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow'}
      `}
    >
      {/* Header / Context */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[150px]" title={goal.title}>{goal.title}</span>
            <span>›</span>
            <span className="truncate max-w-[200px]" title={milestone.statement}>{milestone.statement}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800">{tracker.name}</h3>
        </div>
        
        {/* Info Toggle Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the card focus
            setShowInfo(!showInfo);
          }}
          className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
          title="Show Tracker Info"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Auxiliary Info (Collapsible) */}
      {showInfo && (
        <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-gray-600 animate-in slide-in-from-top-2 fade-in">
          <p className="mb-1">{tracker.info}</p>
          <p className="font-medium text-indigo-800 text-xs mt-2">
            Target: {tracker.targetMin ?? '0'} {tracker.targetMax ? `- ${tracker.targetMax}` : '+'} {tracker.metric} 
            {' '} • Window: {tracker.windowNumDays} days
          </p>
        </div>
      )}

      {/* Expanded Input Form (Visible only when focused) */}
      {isFocused && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-4 fade-in duration-300">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Date</label>
                <input 
                  type="date" 
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Value ({tracker.metric})</label>
                <input 
                  type="number" 
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`e.g., ${tracker.targetMin || 1}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Note / Message (Optional)</label>
              <textarea 
                value={logMessage}
                onChange={(e) => setLogMessage(e.target.value)}
                rows={2}
                placeholder="How did it go?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            
            <div className="flex justify-end mt-1">
              <button 
                type="submit"
                disabled={logValue === ''}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save Log
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export default function LogProgress() {
  const [focusedTrackerId, setFocusedTrackerId] = useState<string | null>(null);
  
//   // This state is just to prove the logging works UI-wise. 
//   // In your real app, this would go to your store or backend.
//   const [savedLogs, setSavedLogs] = useState<LogEntry[]>([]);

  // 1. Flatten the mock goals to easily iterate over all trackers
  const flatTrackers: FlattenedTracker[] = mockGoals.flatMap(goal => 
    goal.milestones.flatMap(milestone => 
      milestone.trackers.map(tracker => ({ goal, milestone, tracker }))
    )
  );

  const handleSaveLog = (trackerId: string, logData: Omit<LogEntry, 'id' | 'trackerId'>) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      trackerId,
      ...logData
    };
    // setSavedLogs(prev => [...prev, newLog]);
    console.log("Saved Log:", newLog);
  };

  return (
    // h-screen and flex-col allow the top area to stay fixed while the bottom scrolls
    <div className="h-screen flex flex-col bg-slate-50">
      
      {/* TOP AREA: Graph Placeholder */}
      <div className="h-[30vh] min-h-[250px] bg-slate-900 flex-shrink-0 flex items-center justify-center border-b border-slate-700 shadow-inner relative z-10">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-slate-400 font-medium tracking-wide">
            {focusedTrackerId 
              ? `Graph rendering area for tracker: ${flatTrackers.find(t => t.tracker.id === focusedTrackerId)?.tracker.name}`
              : 'Select a tracker below to view metrics'
            }
          </p>
        </div>
      </div>

      {/* BOTTOM AREA: Scrollable List */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Progress 📈</h2>
          
          <div className="flex flex-col gap-4 pb-20">
            {flatTrackers.map((item) => (
              <LogCard 
                key={item.tracker.id}
                data={item}
                isFocused={focusedTrackerId === item.tracker.id}
                onFocus={() => setFocusedTrackerId(item.tracker.id)}
                onSave={(logData) => handleSaveLog(item.tracker.id, logData)}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}