import { useState } from 'react';
import type { Goal, Milestone, Tracker, Log } from '../types';
import useTestStore from '../store/useTestStore';
import { handleCreateLog } from "../commService";

// --- Types ---
export interface LogEntry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  message?: string;
}

// Keeping this for the top graph lookup, though it's removed from rendering
interface FlattenedTracker {
  goal: Goal;
  milestone: Milestone;
  tracker: Tracker;
}

// --- Log Card Component ---
// Modified to only take Tracker, as Goal/Milestone context is handled by the parent slabs now
interface LogCardProps {
  tracker: Tracker;
  isFocused: boolean;
  onFocus: () => void;
  onSave: (log: Log) => void;
}
// Added helper function to calculate time ago
const getTimeAgo = (dateString: string) => {
  const logDate = new Date(dateString);
  const today = new Date();
  
  // Calculate difference in milliseconds
  const diffTime = today.getTime() - logDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
};

const LogCard = ({ tracker, isFocused, onFocus, onSave }: LogCardProps) => {
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
      log_message: logMessage.trim() || undefined
    });

    setLogValue('');
    setLogMessage('');
  };

  // 1. Safely extract and sort logs (newest first)
  const sortedLogs = [...(tracker.logs || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // 2. Grab the top 2 most recent logs
  const lastTwoLogs = sortedLogs.slice(0, 2);
  const mostRecentLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : null;

  return (
    <div 
      onClick={onFocus}
      className={`
        bg-white border rounded-xl p-5 cursor-pointer transition-all duration-300 ease-in-out flex-1
        ${isFocused ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow'}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <h3 className="text-lg font-bold text-gray-800">{tracker.name}</h3>
        
        {/* Info Toggle Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
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

      {/* Auxiliary Info */}
      {showInfo && (
        <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-gray-600 animate-in slide-in-from-top-2 fade-in">
          <p className="mb-1">{tracker.info}</p>
          <p className="font-medium text-indigo-800 text-xs mt-2">
            Target: {tracker.target[0] ?? '0'} {tracker.target[1] ? `- ${tracker.target[1]}` : '+'} {tracker.metric} 
            {' '} • Window: {tracker.window} days
          </p>
        </div>
      )}

      {/* Expanded Content (Visible only when clicked/focused) */}
      {isFocused && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-4 fade-in duration-300">
          
          

          {/* Input Form */}
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
                  placeholder={`e.g., ${tracker.target[0] || 1}`}
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

          {/* Recent Logs History Section */}
          <div className="mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
            {sortedLogs.length === 0 ? (
              <p className="text-sm text-slate-500 italic font-medium">No logs yet</p>
            ) : (
              <>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                  Last log {getTimeAgo(mostRecentLogDate!)}
                </p>
                <div className="overflow-hidden border border-slate-200 rounded-md">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-3 py-1.5">Date</th>
                        <th className="px-3 py-1.5">Value</th>
                        <th className="px-3 py-1.5">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {lastTwoLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 whitespace-nowrap text-xs">{log.date}</td>
                          <td className="px-3 py-1.5 font-medium">{log.value}</td>
                          <td className="px-3 py-1.5 text-xs truncate max-w-[120px]" title={log.log_message}>
                            {log.log_message || <span className="text-slate-300 italic">None</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
        </div>
        </div>
      )}
    </div>
  );
};
// --- Main Page Component ---
export default function LogProgress() {
  const [focusedTrackerId, setFocusedTrackerId] = useState<string | null>(null);
  
  const userGoals = useTestStore((state) => state.userGoals);
  const userId = useTestStore((state) => state.userId);
  const setUserGoals = useTestStore((state) => state.setUserGoals);

  // Still useful for a quick lookup by ID for the graph rendering area
  const flatTrackers: FlattenedTracker[] = userGoals.flatMap(goal => 
    goal.milestones.flatMap(milestone => 
      milestone.trackers.map(tracker => ({ goal, milestone, tracker }))
    )
  );

  const handleSaveLog = async (trackerId: string, log: Log) => {
    console.log("Attempting to save log", log)
    const newUserData = await handleCreateLog(userId, trackerId, log)
    setUserGoals(newUserData)
    console.log("Saved Log:", log);
  };

  return (
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

      {/* BOTTOM AREA: Scrollable List with Nested Grouping Slabs */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Progress 📈</h2>
          
          <div className="flex flex-col gap-6 pb-20">
            {/* Map 1: Goals */}
            {userGoals.map((goal) => (
              <div key={goal.id} className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Level 1 Slab (Goal) */}
                <div className="w-8 md:w-10 bg-gradient-to-b from-indigo-500 to-indigo-700 border-r border-indigo-800 flex-shrink-0 flex items-center justify-center relative group cursor-help transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] hover:from-indigo-400 hover:to-indigo-600">
                  {/* Goal Tooltip */}
                  <div className="absolute left-full ml-2 top-4 w-64 p-3 bg-slate-900 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                    <div className="font-bold mb-1 text-sm">{goal.title}</div>
                    <div className="text-slate-300 text-xs">{goal.description}</div>
                  </div>
                  {/* Vertical Text */}
                  <span className="[writing-mode:vertical-lr] rotate-180 text-white font-black tracking-widest text-xs uppercase drop-shadow-md">
                    Goal
                  </span>
                </div>

                {/* Milestones Container */}
                <div className="flex-1 flex flex-col p-3 gap-4 bg-slate-50/50">
                  
                  {/* Map 2: Milestones */}
                  {goal.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex bg-white rounded-lg shadow-sm border border-slate-100">
                      
                      {/* Level 2 Slab (Milestone) */}
                      <div className="w-6 md:w-8 bg-gradient-to-b from-emerald-400 to-emerald-600 border-r border-emerald-700 flex-shrink-0 rounded-l-lg flex items-center justify-center relative group cursor-help transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] hover:from-emerald-300 hover:to-emerald-500">
                        {/* Milestone Tooltip */}
                        <div className="absolute left-full ml-2 top-2 w-56 p-2 bg-slate-900 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-40 pointer-events-none">
                          <div className="font-medium text-xs">{milestone.statement}</div>
                        </div>
                        {/* Vertical Text */}
                        <span className="[writing-mode:vertical-lr] rotate-180 text-white font-bold tracking-widest text-[10px] uppercase drop-shadow-md">
                          Milestone
                        </span>
                      </div>

                      {/* Trackers Container */}
                      <div className="flex-1 p-2 flex flex-col gap-3">
                        
                        {/* Map 3: Trackers (Logs) */}
                        {milestone.trackers.map((tracker) => (
                          <LogCard 
                            key={tracker.id}
                            tracker={tracker}
                            isFocused={focusedTrackerId === tracker.id}
                            onFocus={() => setFocusedTrackerId(tracker.id)}
                            onSave={(logData) => handleSaveLog(tracker.id, logData)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}