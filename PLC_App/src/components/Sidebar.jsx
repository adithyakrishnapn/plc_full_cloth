import React from 'react'

const items = [
	'Dashboard',
	'Live Machine Status',
	'Production Analytics',
	'Defect Reports',
	'History',
	'Settings',
]

export default function Sidebar() {
	return (
		<aside className="hidden min-h-screen w-64 border-r border-white/5 bg-[#0c1222] px-6 py-8 lg:block">
			<div className="text-xl font-semibold text-slate-100">FoldX</div>
			<nav className="mt-10 space-y-3 text-sm">
				{items.map((item, index) => (
					<button
						key={item}
						type="button"
						className={`flex w-full items-center rounded-xl px-3 py-2 text-left transition ${
							index === 0
								? 'bg-white/5 text-slate-100'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						{item}
					</button>
				))}
			</nav>
		</aside>
	)
}
