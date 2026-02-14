import React, { useState, useEffect } from 'react'
import API_CONFIG from '../config/api'

const products = [
	{ id: 'p1', name: 'FoldX Alpha-1', category: 'Premium' },
	{ id: 'p2', name: 'FoldX Beta-2', category: 'Standard' },
	{ id: 'p3', name: 'FoldX Gamma-3', category: 'Testing' },
	{ id: 'p4', name: 'FoldX Delta-4', category: 'Archive' },
]

function FakeQRCode({ size = 44 }) {
	// Generate a random-looking but deterministic 10x10 grid
	return (
		<svg width={size} height={size} viewBox="0 0 10 10" className="opacity-80 transition hover:opacity-100">
			<rect width="10" height="10" fill="#1e293b" />
			{[...Array(30)].map((_, i) => (
				<rect
					key={i}
					x={Math.floor(Math.random() * 8) + 1}
					y={Math.floor(Math.random() * 8) + 1}
					width="1"
					height="1"
					fill={Math.random() > 0.5 ? '#94a3b8' : '#cbd5e1'}
				/>
			))}
			{/* Corner squares to make it look QR-ish */}
			<path d="M1 1h2v2H1zM7 1h2v2H7zM1 7h2v2H1z" fill="#f8fafc" />
		</svg>
	)
}

export default function Sidebar() {
	const [latestProcess, setLatestProcess] = useState(null)
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')

	useEffect(() => {
		const fetchLatestProcess = async () => {
			try {
				const response = await fetch(API_CONFIG.ENDPOINTS.PROCESS_LATEST)
				if (response.ok) {
					const data = await response.json()
					setLatestProcess(data)
				}
			} catch (err) {
				console.error('Failed to fetch latest process:', err)
			}
		}

		fetchLatestProcess()
		// Refresh every 10 seconds to pick up newly completed processes
		const interval = setInterval(fetchLatestProcess, 10000)
		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		const generateQR = async () => {
			// Only generate QR code if process has endTime (is completed)
			if (!latestProcess?.processId || !latestProcess?.endTime) {
				setQrCodeDataUrl('')
				return
			}

			try {
				const QRCode = (await import('qrcode')).default
				const url = `${API_CONFIG.BASE_URL}/api/reports/process/${encodeURIComponent(latestProcess.processId)}`
				const dataUrl = await QRCode.toDataURL(url, {
					width: 88,
					margin: 1,
					color: {
						dark: '#94a3b8',
						light: '#1e293b',
					},
				})
				setQrCodeDataUrl(dataUrl)
			} catch (err) {
				console.error('QR generation failed:', err)
			}
		}

		generateQR()
	}, [latestProcess])

	const handleQRDownload = () => {
		if (!latestProcess?.processId) return
		try {
			const url = `${API_CONFIG.BASE_URL}/api/reports/process/${encodeURIComponent(latestProcess.processId)}`
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', `process-${latestProcess.processId}.pdf`)
			document.body.appendChild(link)
			link.click()
			link.remove()
		} catch (err) {
			console.error('Download failed:', err)
		}
	}

	return (
		<aside className="hidden min-h-screen w-72 border-r border-white/5 bg-[#0c1222] px-6 py-8 lg:block">
			<div className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-100">
				<div className="h-4 w-4 rounded-sm bg-indigo-500" />
				FoldX
			</div>

			{/* <div className="mt-12">
				<h3 className="mb-6 px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
					Managed Products
				</h3>
				<div className="space-y-4">
					{products.map((product) => (
						<div
							key={product.id}
							className="group flex items-center justify-between rounded-2xl border border-white/[0.03] bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
						>
							<div className="flex flex-col gap-1">
								<span className="text-sm font-semibold text-slate-200 group-hover:text-white">
									{product.name}
								</span>
								<span className="text-[10px] text-slate-500">{product.category}</span>
							</div>
							<div className="overflow-hidden rounded-lg shadow-inner">
								<FakeQRCode />
							</div>
						</div>
					))}
				</div>
			</div> */}

			<div className="mt-auto pt-10">
				<div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 border border-indigo-500/10">
					{qrCodeDataUrl ? (
						<div className="flex flex-col items-center gap-3">
							<button
								onClick={handleQRDownload}
								className="rounded-lg hover:opacity-80 transition cursor-pointer bg-white p-2"
							>
								<img src={qrCodeDataUrl} alt="Latest Process QR" className="rounded" />
							</button>
							<p className="text-[10px] text-center leading-relaxed text-slate-300 font-medium">
								Latest Completed: {latestProcess?.processId || 'N/A'}
							</p>
							<p className="text-[10px] text-center leading-relaxed text-slate-500">
								Scan or click to download PDF report
							</p>
							<button
								onClick={handleQRDownload}
								className="w-full mt-2 text-[10px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg py-2 px-3 font-medium transition"
							>
								Download PDF
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-2 text-center">
							<p className="text-[10px] leading-relaxed text-slate-400">
								No completed processes yet
							</p>
							<p className="text-[10px] leading-relaxed text-slate-500">
								QR codes appear here once a process completes
							</p>
						</div>
					)}
				</div>
			</div>
		</aside>
	)
}
