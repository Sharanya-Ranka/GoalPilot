import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  // Legend,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { addDays, differenceInDays, parseISO, format, isBefore } from 'date-fns';
import type { Tracker } from '../types';

interface MiniGraphProps {
  tracker: Tracker;
  currentDay: string; // e.g., "2024-02-22"
}

export const MiniGraph: React.FC<MiniGraphProps> = ({ tracker, currentDay }) => {
  const { chartData, windowBounds } = useMemo(() => {
    // 1. Setup Dates
    const startStr = tracker.window_start_date || currentDay;
    const startDate = parseISO(startStr);
    const endDate = parseISO(currentDay);
    const totalDays = Math.max(0, differenceInDays(endDate, startDate));

    const data = [];
    let currentWindowIndex = 0;
    
    // Running state for the current active window
    let windowAggState = { sum: 0, count: 0, min: Infinity, max: -Infinity };
    const windowSuccessTracker: Record<number, boolean> = {};

    // 2. Hydrate Time Series Data
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = addDays(startDate, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const rawValue = tracker.logs[dateStr];

      // Determine window index
      let wIndex = 0;
      if (tracker.num_windows_to_completion != null && tracker.window_num_days) {
        wIndex = Math.floor(i / tracker.window_num_days);
      }

      // Reset rolling state if we crossed into a new window
      if (wIndex !== currentWindowIndex) {
        currentWindowIndex = wIndex;
        windowAggState = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      }

      // Update rolling state if a log exists for today
      if (rawValue !== undefined) {
        windowAggState.sum += rawValue;
        windowAggState.count += 1;
        windowAggState.min = Math.min(windowAggState.min, rawValue);
        windowAggState.max = Math.max(windowAggState.max, rawValue);
      }

      // Calculate the cumulative check line value
      let cumValue: number | null = null;
      if (windowAggState.count > 0) {
        switch (tracker.aggregation_strategy) {
          case "SUM": cumValue = windowAggState.sum; break;
          case "MEAN": cumValue = windowAggState.sum / windowAggState.count; break;
          case "MIN": cumValue = windowAggState.min; break;
          case "MAX": cumValue = windowAggState.max; break;
          default: cumValue = rawValue !== undefined ? rawValue : null; break;
        }
      }

      // Check success against target_range
      if (cumValue !== null && !windowSuccessTracker[wIndex]) {
        const [minT, maxT] = tracker.target_range;
        const passesMin = minT === null || cumValue >= minT;
        const passesMax = maxT === null || cumValue <= maxT;
        if (passesMin && passesMax) {
          windowSuccessTracker[wIndex] = true;
        }
      }

      data.push({
        date: dateStr,
        originalValue: rawValue !== undefined ? rawValue : null,
        cumulativeValue: cumValue,
        windowIndex: wIndex,
      });
    }

    // 3. Extract Window Boundaries for the Chart Backgrounds
    const bounds = Object.values(
      data.reduce((acc, curr) => {
        if (!acc[curr.windowIndex]) {
          acc[curr.windowIndex] = { 
            index: curr.windowIndex, 
            start: curr.date, 
            end: curr.date, 
            success: false 
          };
        }
        acc[curr.windowIndex].end = curr.date;
        acc[curr.windowIndex].success = windowSuccessTracker[curr.windowIndex] || false;
        return acc;
      }, {} as Record<number, { index: number, start: string, end: string, success: boolean }>)
    );

    console.log("Data", data)

    return { chartData: data, windowBounds: bounds };
  }, [tracker, currentDay]);

  console.log(chartData)

  return (
    <div style={{ width: '100%', height: '100%'}}>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} 
            minTickGap={5}
            tick={{ fontSize: 12, fill: '#666' }}
          />
          <YAxis tick={{ fontSize: 12, fill: '#666' }}/>
          
          
          <Tooltip 
            labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
          />
          {/* <Legend /> */}

          {/* Render Window Highlights and Tick/Cross Marks */}
          {windowBounds.map((window, i) => {
            const isCompleted = window.success;
            // Only show a cross if the window is over and didn't succeed
            const isWindowOver = isBefore(parseISO(window.end), parseISO(currentDay));
            const icon = isCompleted ? '✅' : (isWindowOver ? '❌' : '');

            return (
              <ReferenceArea
                key={`window-${window.index}`}
                x1={window.start}
                x2={window.end}
                // Alternate background colors lightly to distinguish windows
                fill={i % 2 === 0 ? "rgba(200, 200, 200, 0.1)" : "rgba(200, 200, 200, 0.25)"}
                strokeOpacity={0}
              >
                <text
                  x="50%" // Center in the reference area
                  y="20"  // Near the top
                  textAnchor="middle"
                  fontSize={15}
                >
                  {icon}
                </text>
              </ReferenceArea>
            );
          })}

          {/* Original Data Points (Dots) */}
          <Line 
            type="monotone" 
            dataKey="originalValue" 
            name="Daily Log" 
            stroke="#8884d8" 
            strokeDasharray="5 5"
            connectNulls={false} 
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Cumulative Check Line (Solid) */}
          <Line 
            type="stepAfter" 
            dataKey="cumulativeValue" 
            name={`Cumulative (${tracker.aggregation_strategy})`} 
            stroke="#82ca9d" 
            strokeWidth={3}
            connectNulls={true} 
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};