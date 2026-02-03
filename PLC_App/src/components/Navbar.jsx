import React from 'react'

export default function Navbar() {
	return (
		<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-[#0b0f1a] px-6 py-5">
			<div>
				<h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
			</div>
			<div className="flex items-center gap-3">
				<label className="relative">
					<input
						type="date"
						className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400/70"
						defaultValue="2026-06-12"
					/>
				</label>
				<div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500" />
			</div>
		</header>
	)
}
