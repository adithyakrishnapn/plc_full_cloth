import React from 'react'

export default function MonthlyProduction({ bars = [] }) {
  const values = bars.map((bar) => Number(bar.value) || 0)
  const maxProduction = values.length ? Math.max(...values) : 0
  const hasData = maxProduction > 0

  // Debug: log what the chart receives so we can verify data visually in DevTools
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[MonthlyProduction] bars:', bars, 'maxProduction:', maxProduction)
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Monthly Production</h3>
        <span className="text-xs text-slate-500">Last 6 months</span>
      </div>

      {hasData ? (
        <div className="mt-6 flex h-56 items-end gap-3">
          {bars.map((bar) => (
            <div key={bar.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-lg bg-gradient-to-t from-blue-500 to-indigo-400"
                style={{
                  // Use fixed pixel height so bars always render clearly inside the 14rem (h-56) container
                  height: `${40 + ((Number(bar.value) || 0) / maxProduction) * 160}px`,
                }}
              />
              <span className="text-[10px] text-slate-500">{bar.month}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex h-56 items-center justify-center rounded-xl bg-slate-900/40 text-sm text-slate-500">
          No monthly production data available
        </div>
      )}
    </div>
  )
}