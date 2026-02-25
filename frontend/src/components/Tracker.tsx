import React, { useState } from 'react';
import type { Tracker as TrackerType } from '../types';
import { MiniGraph } from './MiniGraph';
import { Check, Save, Settings, X } from 'lucide-react';

// --- VISUALIZATION SUB-COMPONENTS ---

// // 1. The Battery (for SUM)
// const BatteryDisplay = ({ current, target, unit }: { current: number, target: number | null, unit: string }) => {
//   const max = target || 100; // Fallback if no max target
//   const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  
//   let color = "text-red-500";
//   if (percentage > 30) color = "text-yellow-500";
//   if (percentage > 70) color = "text-emerald-500";

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <div className="relative w-16 h-24 border-4 border-gray-300 rounded-lg p-1">
//         {/* Battery Cap */}
//         <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-2 bg-gray-300 rounded-t-sm" />
//         {/* Fill Level */}
//         <div 
//           className={`absolute bottom-0 left-0 right-0 bg-current transition-all duration-500 ${color}`}
//           style={{ height: `${percentage}%`, borderRadius: '2px' }} 
//         />
//         {/* Percentage Text */}
//         <div className="absolute inset-0 flex items-center justify-center font-bold text-black z-10">
//           {Math.round(percentage)}%
//         </div>
//       </div>
//       <span className="mt-2 text-xs font-medium text-gray-500">{current} / {max} {unit}</span>
//     </div>
//   );
// };

// // 2. The Mini Graph (for LATEST)
// const MiniGraphOld = ({ logs, targetRange }: { logs: Record<string, number>, targetRange: [number | null, number | null] }) => {
//   // Convert logs dict to sorted array
//   const data = Object.entries(logs)
//     .map(([date, value]) => ({ date: new Date(date), value }))
//     .sort((a, b) => a.date.getTime() - b.date.getTime());

//   if (data.length === 0) return <div className="text-xs text-gray-400">No data yet</div>;

//   const width = 120;
//   const height = 60;
//   const padding = 5;

//   // Determine Scales
//   const values = data.map(d => d.value);
//   const minVal = Math.min(...values, targetRange[0] || 0) * 0.9;
//   const maxVal = Math.max(...values, targetRange[1] || values[0] * 1.1);
//   const range = maxVal - minVal || 1;

//   const targetMin = targetRange[0] || minVal;
//   const targetMax = targetRange[1] || maxVal;

//   const getX = (index: number) => padding + (index / (data.length - 1 || 1)) * (width - 2 * padding);
//   const getY = (val: number) => height - padding - ((val - minVal) / range) * (height - 2 * padding);

//   // Generate Path
//   const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

//   return (
//     <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
//       {/* Target Zone (Green Band) */}
//       {targetMin!== null && targetMax !== null && (
//         <rect 
//           x={0} 
//           y={getY(targetMax)} 
//           width={width} 
//           height={Math.max(1, getY(targetMin) - getY(targetMax))} 
//           fill="rgba(16, 185, 129, 0.5)" 
//         />
//       )}
      
//       {/* The Line */}
//       <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      
//       {/* The Dots */}
//       {data.map((d, i) => (
//         <circle 
//           key={i} 
//           cx={getX(i)} 
//           cy={getY(d.value)} 
//           r="2" 
//           className="fill-indigo-600 hover:fill-indigo-800 cursor-pointer"
//         >
//           <title>{d.date.toLocaleDateString()}: {d.value}</title>
//         </circle>
//       ))}
//     </svg>
//   );
// };

// --- MAIN COMPONENT ---

interface TrackerProps {
  tracker: TrackerType;
  onLogSubmit: (trackerId: string, value: number, date: string) => Promise<void>;
  onItemUpdate: (type: 'goal' | 'milestone' | 'tracker', id: string, payload: any) => void;
}


export const TrackerItem: React.FC<TrackerProps> = ({ tracker, onLogSubmit, onItemUpdate }) => {
  // --- Logging State ---
  const [logValue, setLogValue] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Configuration State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState({
    log_prompt: tracker.log_prompt || "",
    unit: tracker.unit || "",
    aggregation_strategy: tracker.aggregation_strategy || "SUM",
    target_min: tracker.target_range?.[0] ?? "",
    target_max: tracker.target_range?.[1] ?? "",
  });

  // --- Handlers ---
  const handleSubmit = async () => {
    if (!logValue && tracker.aggregation_strategy !== 'ONE-TIME') return;
    
    setIsSubmitting(true);
    // For Boolean, the button click implies value 1 (True)
    const val = tracker.aggregation_strategy === 'ONE-TIME' ? 1 : parseFloat(logValue);
    
    try {
      await onLogSubmit(tracker.tracker_id, val, logDate);
      setLogValue(""); // Reset input
    } catch (e) {
      console.error("Failed to log:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = async () => {
    console.log("Saving tracker config:", draftConfig);
    onItemUpdate('tracker', tracker.tracker_id, {
      log_prompt: draftConfig.log_prompt,
      unit: draftConfig.unit,
      aggregation_strategy: draftConfig.aggregation_strategy,
      target_min: draftConfig.target_min,
      target_max: draftConfig.target_max,
      // target_range: [
      //   draftConfig.target_min ? parseFloat(draftConfig.target_min) : null, 
      //   draftConfig.target_max ? parseFloat(draftConfig.target_max) : null
      // ]
    });

    // TODO: Call parent handler -> await onUpdateConfig(tracker.tracker_id, mappedDraftConfig);
    setIsSettingsOpen(false);
  };

  const handleCancelConfig = () => {
    // Reset draft to current tracker props
    setDraftConfig({
      log_prompt: tracker.log_prompt || "",
      unit: tracker.unit || "",
      aggregation_strategy: tracker.aggregation_strategy || "SUM",
      target_min: tracker.target_range?.[0] ?? "",
      target_max: tracker.target_range?.[1] ?? "",
    });
    setIsSettingsOpen(false);
  };

  // Hardcoded mock data (from your original snippet)
  tracker.logs = {
    "2026-01-01": 150, "2026-01-02": 210, "2026-01-03": 185,
    "2026-01-04": 320, "2026-01-05": 275, "2026-01-06": 190, "2026-01-07": 415
  };
  tracker.window_start_date = "2026-01-01";

  // --- SETTINGS DRAWER UI ---
  const settingsDrawer = (
    <div className="border-t border-gray-100 bg-gray-50/80 p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configure Tracker</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Prompt */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Log Prompt</label>
          <input 
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={draftConfig.log_prompt}
            onChange={(e) => setDraftConfig({...draftConfig, log_prompt: e.target.value})}
            placeholder="e.g., How many miles did you run?"
          />
        </div>

        {/* Strategy & Unit */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Aggregation Strategy</label>
          <select 
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            value={draftConfig.aggregation_strategy}
            onChange={(e) => setDraftConfig({...draftConfig, aggregation_strategy: e.target.value as any})}
          >
            <option value="SUM">Cumulative (SUM)</option>
            <option value="MEAN">Average (MEAN)</option>
            <option value="MAX">Highest (MAX)</option>
            <option value="MIN">Lowest (MIN)</option>
            <option value="ALL">Consistency (ALL)</option>
            <option value="ONE-TIME">Achievement (ONE-TIME)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input 
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={draftConfig.unit}
            onChange={(e) => setDraftConfig({...draftConfig, unit: e.target.value})}
            placeholder="e.g., miles, kg, hours"
          />
        </div>

        {/* Target Range */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Min (Optional)</label>
          <input 
            type="number"
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={draftConfig.target_min}
            onChange={(e) => setDraftConfig({...draftConfig, target_min: e.target.value})}
            placeholder="No minimum"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Max (Optional)</label>
          <input 
            type="number"
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={draftConfig.target_max}
            onChange={(e) => setDraftConfig({...draftConfig, target_max: e.target.value})}
            placeholder="No maximum"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button onClick={handleCancelConfig} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded transition-colors">
          Cancel
        </button>
        <button onClick={handleSaveConfig} className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-4 py-1.5 rounded transition-colors flex items-center gap-1">
          <Save size={14} /> Save Config
        </button>
      </div>
    </div>
  );

  // --- COMPONENT RENDER ---
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative group">
      
      {/* Settings Toggle Button */}
      <button 
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className={`absolute top-2 left-2 p-1.5 rounded transition-all ${isSettingsOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600 opacity-0 group-hover:opacity-100'}`}
        title="Configure Tracker"
      >
        {isSettingsOpen ? <X size={20} /> : <Settings size={20} />}
      </button>

      {/* Main Tracker View */}
      <div className="p-4 flex flex-col md:flex-row gap-6 min-h-[200px]">
        {/* LEFT: Input & History */}
        <div className="flex-1 flex flex-col gap-3 justify-center z-10">
          <div className="flex flex-col gap-2">
            <h4 className="text-md font-semibold text-gray-700 mb-2 w-full text-center pr-6 md:pr-0">
              {tracker.log_prompt}
            </h4>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-1/3 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              
              {tracker.aggregation_strategy === 'ONE-TIME' ? (
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
                    placeholder={`Value (${tracker.unit})`} 
                    value={logValue}
                    onChange={(e) => setLogValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
        </div>

        {/* RIGHT: Visuals & Status */}
        <div className="flex-1 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
          <div className="h-full w-full flex items-center justify-center">
            {tracker.aggregation_strategy !== "ONE-TIME" && (
              // Assuming MiniGraph is imported and available
              <MiniGraph currentDay='2026-01-08' tracker={tracker} />
            )}

            {tracker.aggregation_strategy === 'ONE-TIME' && (
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                tracker.current_value === 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
              }`}>
                <Check size={32} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {isSettingsOpen && settingsDrawer}

    </div>
  );
};