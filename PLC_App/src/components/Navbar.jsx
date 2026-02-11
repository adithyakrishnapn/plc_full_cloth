import React, { useState, useRef, useEffect } from 'react'
import CustomCalendar from './CustomCalendar'
import ReportModal from './ReportModal'

export default function Navbar() {
	const [showCalendar, setShowCalendar] = useState(false)
	const [showReportModal, setShowReportModal] = useState(false)
	const [selectedDate, setSelectedDate] = useState(new Date('2026-06-12'))
	const calendarRef = useRef(null)

	// Format date for display: DD-MM-YYYY
	const formatDate = (date) => {
		const d = date.getDate().toString().padStart(2, '0')
		const m = (date.getMonth() + 1).toString().padStart(2, '0')
		const y = date.getFullYear()
		return `${d}-${m}-${y}`
	}

	// Close calendar when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (calendarRef.current && !calendarRef.current.contains(event.target)) {
				setShowCalendar(false)
			}
		}
		if (showCalendar) {
			document.addEventListener('mousedown', handleClickOutside)
		}
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [showCalendar])

	return (
		<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-[#0b0f1a] px-6 py-5">
			<div>
				<h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
			</div>
			<div className="flex items-center gap-6">
				<button
					onClick={() => setShowReportModal(true)}
					className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/10 hover:border-indigo-500/30"
				>
					<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					Download Report
				</button>

				<div className="relative" ref={calendarRef}>
					<button
						onClick={() => setShowCalendar(!showCalendar)}
						className="flex w-44 items-center gap-3 rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-4 text-xs font-medium text-slate-200 outline-none transition-all duration-300 hover:border-white/20 hover:bg-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
					>
						<div className="text-indigo-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
								<line x1="16" y1="2" x2="16" y2="6" />
								<line x1="8" y1="2" x2="8" y2="6" />
								<line x1="3" y1="10" x2="21" y2="10" />
							</svg>
						</div>
						<span>{formatDate(selectedDate)}</span>
					</button>

					{showCalendar && (
						<div className="absolute left-0 top-full z-50 mt-2">
							<CustomCalendar
								selectedDate={selectedDate}
								onSelect={(date) => setSelectedDate(date)}
								onClose={() => setShowCalendar(false)}
							/>
						</div>
					)}
				</div>
				<div className="h-10 w-10 rounded-2xl border-2 border-white/5 p-0.5 shadow-lg transition-transform hover:scale-105">
					<div className="h-full w-full rounded-[14px] bg-gradient-to-br from-indigo-500 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />
				</div>
			</div>

			{showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
		</header>
	)
}
