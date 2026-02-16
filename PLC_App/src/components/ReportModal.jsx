import React, { useState, useEffect, useRef } from 'react'
import CustomCalendar from './CustomCalendar'
import API_CONFIG from '../config/api'

export default function ReportModal({ onClose }) {
    const [latestProcess, setLatestProcess] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
    const [rangeQrCodeDataUrl, setRangeQrCodeDataUrl] = useState('')
    const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    const [toDate, setToDate] = useState(new Date())
    const [showFromCalendar, setShowFromCalendar] = useState(false)
    const [showToCalendar, setShowToCalendar] = useState(false)
    const canvasRef = useRef(null)

    // Prevent background scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const response = await fetch(API_CONFIG.ENDPOINTS.PROCESS_LATEST)
                if (!response.ok) {
                    setError('No completed process found')
                    setLatestProcess(null)
                    return
                }
                const data = await response.json()
                setLatestProcess(data)
                setError('')
            } catch (err) {
                console.error('Failed to fetch latest process:', err)
                setError('Failed to load latest process')
            } finally {
                setIsLoading(false)
            }
        }

        fetchLatest()
    }, [])

    // Generate QR for latest process
    useEffect(() => {
        const generateQR = async () => {
            const url = getReportUrl()
            if (!url || !latestProcess?.endTime) {
                setQrCodeDataUrl('')
                return
            }

            try {
                const QRCode = (await import('qrcode')).default
                const dataUrl = await QRCode.toDataURL(url, {
                    width: 140,
                    margin: 1,
                    color: {
                        dark: '#e2e8f0',
                        light: '#0c1222',
                    },
                })
                setQrCodeDataUrl(dataUrl)
            } catch (err) {
                console.error('QR generation failed:', err)
            }
        }

        generateQR()
    }, [latestProcess])

    // Generate QR for date range
    useEffect(() => {
        const generateRangeQR = async () => {
            const from = fromDate.toISOString().split('T')[0]
            const to = toDate.toISOString().split('T')[0]
            const url = `${API_CONFIG.BASE_URL}/api/reports/range?from=${from}&to=${to}`

            try {
                const QRCode = (await import('qrcode')).default
                const dataUrl = await QRCode.toDataURL(url, {
                    width: 140,
                    margin: 1,
                    color: {
                        dark: '#e2e8f0',
                        light: '#0c1222',
                    },
                })
                setRangeQrCodeDataUrl(dataUrl)
            } catch (err) {
                console.error('Range QR generation failed:', err)
            }
        }

        generateRangeQR()
    }, [fromDate, toDate])

    const formatDateTime = (value) => {
        if (!value) return 'N/A'
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
    }

    const getReportUrl = () => {
        if (!latestProcess || !latestProcess.endTime) return null
        if (latestProcess.processId) {
            return `${API_CONFIG.BASE_URL}/api/reports/process/${encodeURIComponent(latestProcess.processId)}`
        }
        return API_CONFIG.ENDPOINTS.REPORT_LATEST
    }

    const formatDate = (date) => {
        const d = date.getDate().toString().padStart(2, '0')
        const m = (date.getMonth() + 1).toString().padStart(2, '0')
        const y = date.getFullYear()
        return `${d}-${m}-${y}`
    }

    const handleDownloadRange = async () => {
        setIsGenerating(true)
        try {
            const from = fromDate.toISOString().split('T')[0]
            const to = toDate.toISOString().split('T')[0]

            const url = `${API_CONFIG.BASE_URL}/api/reports/range?from=${from}&to=${to}`
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `report-${from}-to-${to}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadLatest = async () => {
        try {
            const url = getReportUrl()
            if (!url) return
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `process-${latestProcess?.processId || 'report'}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
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

    const reportUrl = getReportUrl()
    const productionValue = latestProcess?.fabricProcessed ?? latestProcess?.production ?? 'N/A'
    const durationMinutes = latestProcess?.durationMinutes
    const isComplete = Boolean(latestProcess?.endTime)

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-lg animate-in fade-in duration-300"
        >
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    setShowFromCalendar(false)
                    setShowToCalendar(false)
                }}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0c1222] to-[#0a0e18] p-8 shadow-2xl shadow-indigo-500/20 transition-all duration-300 animate-in zoom-in-95"
            >
                <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Production Reports</h2>
                    <p className="mt-2 text-sm text-slate-400">Generate reports by date range or view the latest completed process.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Date Range Selection */}
                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Date Range Report
                        </h3>
                        <div className="relative">
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">From Date</label>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
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

                        <div className="relative">
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">To Date</label>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
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

                        <button
                            onClick={handleDownloadRange}
                            disabled={isGenerating}
                            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 shadow-lg shadow-indigo-500/30"
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download Report
                                </span>
                            )}
                        </button>

                        {rangeQrCodeDataUrl && (
                            <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={handleDownloadRange}
                                        className="bg-white p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                                    >
                                        <img src={rangeQrCodeDataUrl} alt="Range Report QR Code" className="rounded" />
                                    </button>
                                    <p className="text-xs text-indigo-300 font-medium">Click or scan to download date range PDF</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Latest Process Section */}
                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Latest Process
                        </h3>

                        {isLoading ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading...
                                </div>
                            </div>
                        ) : error ? (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 text-center">
                                {error}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-4">
                                    <div className="grid gap-2.5 text-sm">
                                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Process ID</span>
                                            <span className="font-mono text-slate-100 font-semibold">{latestProcess?.processId || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Textile ID</span>
                                            <span className="font-mono text-slate-100 font-semibold">{latestProcess?.textileId || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Start Time</span>
                                            <span className="text-slate-300 text-xs">{formatDateTime(latestProcess?.startTime)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">End Time</span>
                                            <span className="text-slate-300 text-xs">{formatDateTime(latestProcess?.endTime)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Duration</span>
                                            <span className="font-mono text-emerald-400 font-semibold">
                                                {durationMinutes != null ? Number(durationMinutes).toFixed(2) : 'N/A'} min
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Production</span>
                                            <span className="font-mono text-blue-400 font-semibold">{productionValue}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
                                    {isComplete && qrCodeDataUrl ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <a
                                                href={getReportUrl()}
                                                download
                                                className="bg-white p-2 rounded-lg hover:opacity-80 transition cursor-pointer"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    handleDownloadLatest()
                                                }}
                                            >
                                                <img src={qrCodeDataUrl} alt="QR Code" className="rounded" />
                                            </a>
                                            <p className="text-xs text-indigo-300 font-medium">Click or scan to download PDF</p>
                                            <button
                                                onClick={handleDownloadLatest}
                                                className="w-full rounded-lg bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/30"
                                            >
                                                Download PDF
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 text-center">QR code available after process completion</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-white/5 p-3 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white border border-white/10"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
