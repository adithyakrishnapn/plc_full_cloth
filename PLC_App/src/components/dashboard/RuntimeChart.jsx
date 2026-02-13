import React, { useRef } from 'react'
import { useResizeObserver } from '../../hooks/useResizeObserver'

export default function RuntimeChart({ points = [] }) {
  const containerRef = useRef(null)
  const { width } = useResizeObserver(containerRef)
  const hasPoints = points && points.length > 0

  console.log('RuntimeChart received points:', points, 'hasPoints:', hasPoints)

  // Use measured width or a sensible fallback during initial render
  const chartWidth = width || 600
  const chartHeight = 256 // Matches h-64 (16rem)

  // Spread points horizontally to fill the width,
  // and normalize Y values so the line uses most of the vertical space.
  const chartPoints = hasPoints
    ? (() => {
      const count = points.length
      const paddingX = 40
      const startX = paddingX
      const endX = chartWidth - paddingX
      const innerWidth = Math.max(0, endX - startX)
      const step = count > 1 ? innerWidth / (count - 1) : 0

      const rawYs = points.map((p) => p.y)
      const minRawY = Math.min(...rawYs)
      const maxRawY = Math.max(...rawYs)

      // Target vertical range inside viewport
      const top = 40
      const bottom = chartHeight - 60

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
    <div
      ref={containerRef}
      className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.55)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Daily Machine Runtime</h3>
        <span className="text-xs text-slate-500">Last 12 hours</span>
      </div>
      <div className="mt-6">
        {hasPoints ? (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-64 w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="runtimeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6d7cff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <g className="text-slate-800" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2">
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                const y = 40 + ratio * (chartHeight - 100)
                return <line key={y} x1="20" y1={y} x2={chartWidth - 20} y2={y} />
              })}
            </g>
            <polyline
              fill="none"
              stroke="url(#runtimeGlow)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartPoints.map((point) => `${point._x},${point._y}`).join(' ')}
            />
            {chartPoints.map((point, index) => (
              <circle
                key={`circle-${index}`}
                cx={point._x}
                cy={point._y}
                r={index === chartPoints.length - 1 ? 5 : 3}
                fill={index === chartPoints.length - 1 ? '#a78bfa' : '#6d7cff'}
                className="transition-all duration-300"
              />
            ))}
            <g className="text-[11px] font-medium text-slate-500" fill="currentColor">
              {chartPoints.map((point, index) => {
                // Show approx 6-8 labels max
                const labelStep = Math.max(1, Math.floor(chartPoints.length / 6))
                if (index % labelStep !== 0 && index !== chartPoints.length - 1) return null
                return (
                  <text key={`label-${index}`} x={point._x} y={chartHeight - 15} textAnchor="middle">
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