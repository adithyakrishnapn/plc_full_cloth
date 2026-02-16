import React from 'react'

export default function StatCards({ stats = [] }) {
  if (!stats || stats.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_12px_40px_rgba(2,6,23,0.55)]"
        >
          <p className="text-xs text-slate-400">{item.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${item.accent ?? 'text-slate-100'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}