import React, { useState, useEffect, useRef } from 'react'
import CustomCalendar from './CustomCalendar'

export default function ReportModal({ onClose }) {
    const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    const [toDate, setToDate] = useState(new Date())
    const [showFromCalendar, setShowFromCalendar] = useState(false)
    const [showToCalendar, setShowToCalendar] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    // Prevent background scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    const formatDate = (date) => {
        const d = date.getDate().toString().padStart(2, '0')
        const m = (date.getMonth() + 1).toString().padStart(2, '0')
        const y = date.getFullYear()
        return `${d}-${m}-${y}`
    }

    const handleDownload = async () => {
        setIsGenerating(true)
        try {
            const from = fromDate.toISOString().split('T')[0]
            const to = toDate.toISOString().split('T')[0]

            const url = `http://localhost:8080/api/reports/download?from=${from}&to=${to}`
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', '')
            document.body.appendChild(link)
            link.click()
            link.remove()

            onClose()
        } catch (error) {
            console.error('Download failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleBackdropClick = () => {
        if (showFromCalendar || showToCalendar) {
            setShowFromCalendar(false)
            setShowToCalendar(false)
        } else {
            onClose()
        }
    }

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md animate-in fade-in duration-300"
        >
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    // Clicking anywhere else in the modal should close calendars
                    setShowFromCalendar(false)
                    setShowToCalendar(false)
                }}
                className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c1222] p-8 shadow-2xl shadow-indigo-500/10 transition-all duration-300 animate-in zoom-in-95"
            >
                <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-white">Generate Industrial Report</h2>
                    <p className="mt-2 text-sm text-slate-400">Select the date range for your production analytics.</p>
                </div>

                <div className="space-y-6">
                    {/* From Date */}
                    <div className="relative">
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">From Date</label>
                        <button
                            onClick={(e) => {
                                e.stopPropagation() // Don't trigger the modal's container click
                                setShowFromCalendar(!showFromCalendar)
                                setShowToCalendar(false)
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm font-medium text-slate-200 transition hover:border-white/10 hover:bg-white/10"
                        >
                            <div className="text-indigo-400">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            {formatDate(fromDate)}
                        </button>
                        {showFromCalendar && (
                            <div className="absolute left-0 top-full z-[60] mt-2" onClick={(e) => e.stopPropagation()}>
                                <CustomCalendar
                                    selectedDate={fromDate}
                                    onSelect={(date) => {
                                        setFromDate(date)
                                        setShowFromCalendar(false)
                                    }}
                                    onClose={() => setShowFromCalendar(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* To Date */}
                    <div className="relative">
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">To Date</label>
                        <button
                            onClick={(e) => {
                                e.stopPropagation() // Don't trigger the modal's container click
                                setShowToCalendar(!showToCalendar)
                                setShowFromCalendar(false)
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm font-medium text-slate-200 transition hover:border-white/10 hover:bg-white/10"
                        >
                            <div className="text-indigo-400">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            {formatDate(toDate)}
                        </button>
                        {showToCalendar && (
                            <div className="absolute left-0 top-full z-[60] mt-2" onClick={(e) => e.stopPropagation()}>
                                <CustomCalendar
                                    selectedDate={toDate}
                                    onSelect={(date) => {
                                        setToDate(date)
                                        setShowToCalendar(false)
                                    }}
                                    onClose={() => setShowToCalendar(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-10 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl bg-white/5 p-4 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 rounded-2xl bg-indigo-500 p-4 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>
        </div>
    )
}
