import { useState, useRef, useEffect } from 'react';
import type { GoalData, Milestone, Tracker } from '../types';

// ==========================================
// 2. Helper: Inline Edit Component
// Double-click to edit strings without clutter
// ==========================================
interface InlineEditProps {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  textClass?: string;
  inputClass?: string;
  placeholder?: string;
}

const InlineEdit = ({ value, onChange, multiline, textClass, inputClass, placeholder }: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlurOrSubmit = () => {
    setIsEditing(false);
    if (tempValue !== value) onChange(tempValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) handleBlurOrSubmit();
    if (e.key === 'Escape') {
      setTempValue(value); // Revert
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonProps = {
      value: tempValue,
      onChange: (e: any) => setTempValue(e.target.value),
      onBlur: handleBlurOrSubmit,
      onKeyDown: handleKeyDown,
      className: `w-full border-2 border-indigo-400 rounded outline-none px-2 py-1 ${inputClass || ''}`,
      placeholder
    };

    return multiline ? (
      <textarea ref={inputRef as any} {...commonProps} rows={3} />
    ) : (
      <input ref={inputRef as any} {...commonProps} />
    );
  }

  return (
    <div 
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
      className={`cursor-text hover:bg-gray-100/50 rounded px-1 -ml-1 transition-colors ${textClass || ''} ${!value ? 'text-gray-400 italic' : ''}`}
    >
      {value || placeholder || 'Empty value'}
    </div>
  );
};

// ==========================================
// 3. Editable Tracker Component
// ==========================================
const EditableTracker = ({ tracker, onUpdate }: { tracker: Tracker; onUpdate: (t: Tracker) => void }) => {
  const handleChange = (field: keyof Tracker, value: any) => {
    onUpdate({ ...tracker, [field]: value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3">
      {/* Strings (Double Click to Edit) */}
      <div className="mb-4 space-y-1">
        <InlineEdit 
          value={tracker.name} 
          onChange={(v) => handleChange('name', v)} 
          textClass="font-semibold text-gray-800" 
          placeholder="Tracker Name (e.g., Daily Running)" 
        />
        <InlineEdit 
          value={tracker.info} 
          onChange={(v) => handleChange('info', v)} 
          textClass="text-sm text-gray-500" 
          placeholder="Auxiliary Info (e.g., Use the treadmill or run outside)" 
          multiline 
        />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-400">Metric/Unit:</span>
          <InlineEdit 
            value={tracker.metric} 
            onChange={(v) => handleChange('metric', v)} 
            textClass="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded" 
            placeholder="e.g., km, minutes, pages" 
          />
        </div>
      </div>

      {/* Structured Configuration (Standard Inputs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
        
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Aggregation Strategy</label>
          <select 
            value={tracker.aggregationStrategy}
            onChange={(e) => handleChange('aggregationStrategy', e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-1.5 focus:border-indigo-500 outline-none"
          >
            {['SUM', 'MEAN', 'MIN', 'MAX', 'ONE-TIME', 'ALL'].map(strat => (
              <option key={strat} value={strat}>{strat}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Target [Min, Max]</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="Min" 
              value={tracker.targetMin === null ? '' : tracker.targetMin}
              onChange={(e) => handleChange('targetMin', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md text-sm px-3 py-1.5 outline-none"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={tracker.targetMax === null ? '' : tracker.targetMax}
              onChange={(e) => handleChange('targetMax', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md text-sm px-3 py-1.5 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Window (Days)</label>
          <input 
            type="number" 
            min="1"
            value={tracker.windowNumDays}
            onChange={(e) => handleChange('windowNumDays', Number(e.target.value))}
            className="border border-gray-300 rounded-md text-sm px-3 py-1.5 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Success Criteria (Windows)</label>
          <input 
            type="number" 
            min="1"
            value={tracker.successCriteria}
            onChange={(e) => handleChange('successCriteria', Number(e.target.value))}
            className="border border-gray-300 rounded-md text-sm px-3 py-1.5 outline-none"
          />
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 4. Editable Milestone Component
// ==========================================
const EditableMilestone = ({ milestone, onUpdate }: { milestone: Milestone; onUpdate: (m: Milestone) => void }) => {
  
  const addTracker = () => {
    const newTracker: Tracker = {
      id: crypto.randomUUID(),
      name: '',
      info: '',
      metric: '',
      aggregationStrategy: 'SUM',
      targetMin: null,
      targetMax: null,
      windowNumDays: 1,
      successCriteria: 1,
    };
    onUpdate({ ...milestone, trackers: [...milestone.trackers, newTracker] });
  };

  const updateTracker = (updatedTracker: Tracker) => {
    const updatedTrackers = milestone.trackers.map(t => t.id === updatedTracker.id ? updatedTracker : t);
    onUpdate({ ...milestone, trackers: updatedTrackers });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
      <div className="mb-4">
        {/* <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Milestone</span> */}
        <InlineEdit 
          value={milestone.statement} 
          onChange={(v) => onUpdate({ ...milestone, statement: v })} 
          textClass="text-lg font-bold text-slate-700" 
          placeholder="Milestone Statement (e.g., Run consistently for a month)" 
        />
      </div>

      <div className="pl-4 border-l-2 border-indigo-200">
        {milestone.trackers.map(tracker => (
          <EditableTracker key={tracker.id} tracker={tracker} onUpdate={updateTracker} />
        ))}
        
        <button 
          onClick={addTracker}
          className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <span>+</span> Add Tracker
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 5. Main Editable Goal Component
// ==========================================
export default function EditableGoal({ goalData, setGoalData }: { goalData: GoalData; setGoalData: (goal: GoalData) => void }) {

  const goal: GoalData = goalData
  
  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      statement: '',
      trackers: []
    };
    setGoalData({ ...goal, milestones: [...goal.milestones, newMilestone] });
  };

  const updateMilestone = (updatedMilestone: Milestone) => {
    const updatedMilestones = goal.milestones.map(m => m.id === updatedMilestone.id ? updatedMilestone : m);
    setGoalData({ ...goal, milestones: updatedMilestones });
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      
      {/* Goal Headers */}
      <div className="mb-8">
        <InlineEdit 
          value={goal.title} 
          onChange={(v) => setGoalData({ ...goal, title: v })} 
          textClass="text-3xl font-extrabold text-gray-900 mb-2" 
          inputClass="text-3xl font-extrabold mb-2"
          placeholder="Goal Title" 
        />
        <InlineEdit 
          value={goal.description} 
          onChange={(v) => setGoalData({ ...goal, description: v })} 
          textClass="text-gray-600 text-lg mb-2" 
          placeholder="Goal Description" 
          multiline
        />
        <InlineEdit 
          value={goal.info} 
          onChange={(v) => setGoalData({ ...goal, info: v })} 
          textClass="text-sm text-gray-400" 
          placeholder="Additional Information" 
          multiline
        />
      </div>

      {/* <hr className="my-6 border-gray-900" /> */}

      {/* Milestones Area */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Milestones</h3>
        </div>

        {goal.milestones.map(milestone => (
          <EditableMilestone key={milestone.id} milestone={milestone} onUpdate={updateMilestone} />
        ))}

        <button 
          onClick={addMilestone}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2 mt-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Milestone
        </button>
      </div>

      {/* Demo: See the resulting JSON */}
      <div className="mt-12 p-4 bg-gray-800 rounded-lg overflow-x-auto">
        <p className="text-gray-400 text-xs mb-2 uppercase tracking-widest">State Debug Output</p>
        <pre className="text-emerald-400 text-xs">
          {JSON.stringify(goal, null, 2)}
        </pre>
      </div>

    </div>
  );
}