import React, { useState } from 'react'

export default function CustomCalendar({ selectedDate, onSelect, onClose }) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || Date.now()))

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const isSelected = selectedDate &&
            selectedDate.getDate() === d &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear()

        days.push(
            <button
                key={d}
                onClick={() => {
                    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
                    onSelect(newDate)
                    onClose()
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all ${isSelected
                        ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
            >
                {d}
            </button>
        )
    }

    return (
        <div className="w-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
                <button onClick={prevMonth} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <span className="text-sm font-semibold text-slate-100">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button onClick={nextMonth} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="h-8 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {day}
                    </div>
                ))}
                {days}
            </div>
            <div className="mt-4 border-t border-white/5 pt-3">
                <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                    Close
                </button>
            </div>
        </div>
    )
}
