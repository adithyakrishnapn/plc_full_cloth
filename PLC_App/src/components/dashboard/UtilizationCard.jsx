import React, { useContext, useMemo } from 'react'
import { DashboardContext } from '../../context/DashboardContext'

export default function UtilizationCard() {
  const { state } = useContext(DashboardContext)

  const utilizationPercent = useMemo(() => {
    const utilizationStat = state.stats.find((stat) => stat.label === 'Utilization')
    if (utilizationStat) {
      // Remove any non-numeric characters (like %) and parse
      const value = parseFloat(utilizationStat.value.toString().replace(/[^0-9.]/g, ''))
      return isNaN(value) ? 0 : Math.round(value)
    }
    return 0
  }, [state.stats])

  const getGradientColor = (percent) => {
    if (percent > 80) return '#10b981' // Green
    if (percent > 60) return '#3b82f6' // Blue
    if (percent > 40) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }

  const gradientColor = getGradientColor(utilizationPercent)

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 text-center shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <h3 className="text-sm font-semibold text-slate-200">Machine Utilization</h3>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative h-32 w-32">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${gradientColor} 0deg ${utilizationPercent * 3.6}deg, rgba(148,163,184,0.2) ${utilizationPercent * 3.6}deg 360deg)`,
            }}
          />
          <div className="absolute inset-4 rounded-full bg-[#0b0f1a]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <div className="text-xl font-semibold text-slate-100">{utilizationPercent}%</div>
              <div className="text-xs text-slate-500">Utilized</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
