import React, { useState } from 'react';
import { Check, Save } from 'lucide-react';
import type { Tracker as TrackerType } from '../types';

// --- VISUALIZATION SUB-COMPONENTS ---

// 1. The Battery (for SUM)
const BatteryDisplay = ({ current, target, unit }: { current: number, target: number | null, unit: string }) => {
  const max = target || 100; // Fallback if no max target
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  
  let color = "text-red-500";
  if (percentage > 30) color = "text-yellow-500";
  if (percentage > 70) color = "text-emerald-500";

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-16 h-24 border-4 border-gray-300 rounded-lg p-1">
        {/* Battery Cap */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-2 bg-gray-300 rounded-t-sm" />
        {/* Fill Level */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-current transition-all duration-500 ${color}`}
          style={{ height: `${percentage}%`, borderRadius: '2px' }} 
        />
        {/* Percentage Text */}
        <div className="absolute inset-0 flex items-center justify-center font-bold text-black z-10">
          {Math.round(percentage)}%
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-gray-500">{current} / {max} {unit}</span>
    </div>
  );
};

// 2. The Mini Graph (for LATEST)
const MiniGraph = ({ logs, targetRange }: { logs: Record<string, number>, targetRange: [number | null, number | null] }) => {
  // Convert logs dict to sorted array
  const data = Object.entries(logs)
    .map(([date, value]) => ({ date: new Date(date), value }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (data.length === 0) return <div className="text-xs text-gray-400">No data yet</div>;

  const width = 120;
  const height = 60;
  const padding = 5;

  // Determine Scales
  const values = data.map(d => d.value);
  const minVal = Math.min(...values, targetRange[0] || 0) * 0.9;
  const maxVal = Math.max(...values, targetRange[1] || values[0] * 1.1);
  const range = maxVal - minVal || 1;

  const targetMin = targetRange[0] || minVal;
  const targetMax = targetRange[1] || maxVal;

  const getX = (index: number) => padding + (index / (data.length - 1 || 1)) * (width - 2 * padding);
  const getY = (val: number) => height - padding - ((val - minVal) / range) * (height - 2 * padding);

  // Generate Path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Target Zone (Green Band) */}
      {targetMin!== null && targetMax !== null && (
        <rect 
          x={0} 
          y={getY(targetMax)} 
          width={width} 
          height={Math.max(1, getY(targetMin) - getY(targetMax))} 
          fill="rgba(16, 185, 129, 0.5)" 
        />
      )}
      
      {/* The Line */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      
      {/* The Dots */}
      {data.map((d, i) => (
        <circle 
          key={i} 
          cx={getX(i)} 
          cy={getY(d.value)} 
          r="2" 
          className="fill-indigo-600 hover:fill-indigo-800 cursor-pointer"
        >
          <title>{d.date.toLocaleDateString()}: {d.value}</title>
        </circle>
      ))}
    </svg>
  );
};

// --- MAIN COMPONENT ---

interface TrackerProps {
  tracker: TrackerType;
  onLogSubmit: (trackerId: string, value: number, date: string) => Promise<void>;
}

export const TrackerItem: React.FC<TrackerProps> = ({ tracker, onLogSubmit }) => {
  const [logValue, setLogValue] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!logValue && tracker.metric_type !== 'BOOLEAN') return;
    
    setIsSubmitting(true);
    // For Boolean, the button click implies value 1 (True)
    const val = tracker.metric_type === 'BOOLEAN' ? 1 : parseFloat(logValue);
    
    try {
      await onLogSubmit(tracker.tracker_id, val, logDate);
      setLogValue(""); // Reset input
    } catch (e) {
      console.error("Failed to log:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort logs for history list (Newest first)
  tracker.logs = {
  "2026-01-01": 150,
  "2026-01-02": 210,
  "2026-01-03": 185,
  "2026-01-04": 320,
  "2026-01-05": 275,
  "2026-01-06": 190,
  "2026-01-07": 415
};
  const history = Object.entries(tracker.logs)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 3); // Top 3

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-6">
      
      {/* LEFT: Visuals & Status */}
      <div className="flex-1 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 w-full text-center">{tracker.log_prompt}</h4>
        
        <div className="h-24 w-full flex items-center justify-center">
          {tracker.metric_type === 'SUM' && (
            <BatteryDisplay 
              current={tracker.current_value} 
              target={tracker.target_range[1] || tracker.target_range[0]} 
              unit={tracker.unit} 
            />
          )}
          
          {tracker.metric_type === 'LATEST' && (
            <MiniGraph logs={tracker.logs} targetRange={tracker.target_range} />
          )}

          {tracker.metric_type === 'BOOLEAN' && (
             <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
               tracker.current_value === 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
             }`}>
               <Check size={32} />
             </div>
          )}
        </div>
      </div>

      {/* RIGHT: Input & History */}
      <div className="flex-1 flex flex-col gap-3">
        
        {/* Input Area */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">Log Entry</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-1/3 text-xs border border-gray-300 rounded px-2 py-1"
            />
            
            {tracker.metric_type === 'BOOLEAN' ? (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded py-1 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Mark Complete'} <Check size={12} />
              </button>
            ) : (
              <>
                <input 
                  type="number" 
                  placeholder="Value" 
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                />
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-1.5 rounded transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="mt-1">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Recent History</label>
          <ul className="mt-1 space-y-1">
            {history.length > 0 ? history.map(([date, val]) => (
              <li key={date} className="flex justify-between text-xs text-gray-600 border-b border-gray-50 pb-1 last:border-0">
                <span>{new Date(date).toLocaleDateString()}</span>
                <span className="font-mono font-medium">{val} {tracker.unit}</span>
              </li>
            )) : (
              <li className="text-xs text-gray-400 italic">No logs yet.</li>
            )}
          </ul>
        </div>

      </div>
    </div>
  );
};