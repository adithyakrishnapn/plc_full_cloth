import React from 'react'

export default function RuntimeChart({ points = [] }) {
  const hasPoints = points && points.length > 0

  // Spread points horizontally to fill the width,
  // and normalize Y values so the line uses most of the vertical space.
  const chartPoints = hasPoints
    ? (() => {
        const count = points.length
        const startX = 4
        const endX = 116
        const innerWidth = endX - startX
        const step = count > 1 ? innerWidth / (count - 1) : 0

        const rawYs = points.map((p) => p.y)
        const minRawY = Math.min(...rawYs)
        const maxRawY = Math.max(...rawYs)

        // Target vertical range inside viewBox
        const top = 18
        const bottom = 82

        return points.map((point, index) => {
          const x = startX + index * step
          let normY = (top + bottom) / 2
          if (maxRawY !== minRawY) {
            const ratio = (point.y - minRawY) / (maxRawY - minRawY)
            normY = bottom - ratio * (bottom - top)
          }
          return { ...point, _x: x, _y: normY }
        })
      })()
    : []

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Daily Machine Runtime</h3>
        <span className="text-xs text-slate-500">Last 12 hours</span>
      </div>
      <div className="mt-6">
        {hasPoints ? (
          <svg viewBox="0 0 120 100" className="h-64 w-full">
            <defs>
              <linearGradient id="runtimeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6d7cff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <g className="text-[4px] text-slate-600" fill="none" stroke="#1f2937" strokeWidth="0.3">
              {[15, 30, 45, 60, 75, 90].map((y) => (
                <line key={y} x1="4" y1={y} x2="116" y2={y} />
              ))}
            </g>
            <polyline
              fill="none"
              stroke="url(#runtimeGlow)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartPoints.map((point) => `${point._x},${point._y}`).join(' ')}
            />
            {chartPoints.map((point, index) => (
              <circle
                key={point.label}
                cx={point._x}
                cy={point._y}
                r={index === chartPoints.length - 1 ? 2.4 : 1.4}
                fill={index === chartPoints.length - 1 ? '#a78bfa' : '#6d7cff'}
              />
            ))}
            <g className="text-[5px] text-slate-500" fill="#6b7280">
              {chartPoints.map((point, index) => {
                const labelStep = Math.ceil(chartPoints.length / 6) || 1
                if (index % labelStep !== 0) return null
                return (
                  <text key={point.label} x={point._x - 4} y="98">
                    {point.label}
                  </text>
                )
              })}
            </g>
          </svg>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            No runtime data available
          </div>
        )}
      </div>
    </div>
  )
}