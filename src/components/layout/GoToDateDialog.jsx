import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCalendar, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const GoToDateDialog = ({ onClose, onGoTo }) => {
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('goToDateDialog_date') || new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(() => localStorage.getItem('goToDateDialog_time') || '00:00');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  // 0 is Sunday, we want Monday to be 0 for the UI
  const startDayOffset = (firstDayOfMonth + 6) % 7; 
  
  const handleDateClick = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12);
    // adjust for local timezone offset when getting ISO string
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    setSelectedDate(localDate);
    localStorage.setItem('goToDateDialog_date', localDate);
  };

  const handleGoTo = () => {
    const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    if (!isNaN(dateTime.getTime())) {
      onGoTo(dateTime);
    }
    onClose();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
        <div className="bg-[#1e222d] w-[350px] rounded-lg shadow-2xl overflow-hidden flex flex-col text-[#d1d4dc] font-sans border border-[#434651]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 pb-2">
          <h2 className="text-xl font-bold">Go to</h2>
          <button onClick={onClose} className="text-[#a3a6af] hover:text-white transition-colors cursor-pointer">
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 border-b border-[#2a2e39] flex gap-4 text-sm font-semibold">
          <div className="border-b-2 border-[#2962ff] text-white pb-2 cursor-pointer">Date</div>
        </div>

        {/* Inputs */}
        <div className="p-4 flex gap-2">
          <div className="flex-1 flex items-center bg-[#2a2e39] border border-[#2962ff] rounded p-2 focus-within:ring-1 ring-[#2962ff]">
            <input 
              type="text" 
              className="bg-transparent border-none outline-none text-[#d1d4dc] w-full text-sm font-semibold"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                localStorage.setItem('goToDateDialog_date', e.target.value);
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) {
                  setCurrentMonth(d);
                }
              }}
            />
            <FiCalendar className="text-[#a3a6af] ml-2 shrink-0" size={16}/>
          </div>
          <div className="flex-1 flex items-center bg-[#2a2e39] border border-[#434651] rounded p-2 focus-within:ring-1 ring-[#2962ff]">
            <input 
              type="text" 
              className="bg-transparent border-none outline-none text-[#d1d4dc] w-full text-sm font-semibold"
              value={selectedTime}
              onChange={(e) => {
                setSelectedTime(e.target.value);
                localStorage.setItem('goToDateDialog_time', e.target.value);
              }}
            />
            <FiClock className="text-[#a3a6af] ml-2 shrink-0" size={16}/>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="px-4 pb-4 select-none">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="text-[#a3a6af] hover:text-white cursor-pointer"><FiChevronLeft size={20}/></button>
            <div className="font-semibold text-[15px]">{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
            <button onClick={handleNextMonth} className="text-[#a3a6af] hover:text-white cursor-pointer"><FiChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-[#a3a6af] uppercase font-bold">
            <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[13px] font-semibold">
            {Array.from({ length: startDayOffset }).map((_, i) => <div key={`empty-${i}`}></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12);
              const dateStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              return (
                <div 
                  key={day} 
                  onClick={() => handleDateClick(day)}
                  className={`py-[6px] cursor-pointer rounded hover:bg-[#2a2e39] transition-colors ${isSelected ? 'bg-white text-black font-bold' : ''}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2a2e39] p-4 flex justify-end gap-2 bg-[#1e222d]">
          <button onClick={onClose} className="px-6 py-2 rounded border border-[#434651] text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button onClick={handleGoTo} className="px-6 py-2 rounded bg-white text-black hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer">
            Go to
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
};

export default GoToDateDialog;
