import { useState, useMemo } from 'react';

export default function TodaysPlan() {
  // Store the real current date to calculate the 1-year limits
  const today = useMemo(() => new Date(), []);
  
  // State for the currently viewed month
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // --- Calendar Math ---
  const { days, monthName, year } = useMemo(() => {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    
    // Get total days in the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Get the day of the week the month starts on (0 = Sunday, 6 = Saturday)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    // Get total days in the previous month (to fill the leading empty grid cells)
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const daysArray = [];

    // 1. Fill previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      daysArray.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateString: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i).toLocaleDateString(),
      });
    }

    // 2. Fill current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateString: new Date(currentYear, currentMonth, i).toLocaleDateString(),
        isToday: i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
      });
    }

    // 3. Fill next month's leading days to complete the 42-cell grid (6 rows of 7)
    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysArray.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateString: new Date(currentYear, currentMonth + 1, i).toLocaleDateString(),
      });
    }

    const formatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
    
    return {
      days: daysArray,
      monthName: formatter.format(viewDate),
      year: currentYear
    };
  }, [viewDate, today]);

  // --- Navigation Logic ---
  const handlePrevMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      // Limit to 1 year in the past
      const minDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      return newDate < minDate ? prev : newDate;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      // Limit to 1 year in the future
      const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), 1);
      return newDate > maxDate ? prev : newDate;
    });
  };

  // Determine if buttons should be disabled
  const isPrevDisabled = viewDate <= new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const isNextDisabled = viewDate >= new Date(today.getFullYear() + 1, today.getMonth(), 1);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in duration-500 h-screen flex flex-col">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 flex-shrink-0">Today's Plan 📅</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50 flex-shrink-0">
          <button 
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-bold text-slate-800">
            {monthName} {year}
          </h2>
          
          <button 
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Days of the Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 bg-gray-200 gap-[1px]">
          {days.map((dayObj, index) => (
            <div 
              key={index} 
              // 'group' is required here so the child tooltip knows when the cell is hovered
              className={`
                group relative bg-white p-2 transition-colors hover:bg-indigo-50 cursor-pointer
                ${!dayObj.isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'text-gray-800'}
              `}
            >
              {/* Day Number */}
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                ${dayObj.isToday ? 'bg-indigo-600 text-white shadow-md' : ''}
              `}>
                {dayObj.dayNumber}
              </div>

              {/* Hover Tooltip (Absolute positioned, hidden by default, visible on group-hover) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10 w-[120px]">
                <div className="bg-slate-900 text-white text-xs text-center py-2 px-3 rounded-lg shadow-xl">
                  This day is {dayObj.dateString}
                </div>
                {/* Tooltip Triangle Pointer */}
                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}