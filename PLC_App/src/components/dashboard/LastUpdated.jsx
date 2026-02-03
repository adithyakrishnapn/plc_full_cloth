import React from 'react'

export default function LastUpdated({ lastUpdated }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center text-xs text-slate-500 shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      Last Updated {lastUpdated}
    </div>
  )
}