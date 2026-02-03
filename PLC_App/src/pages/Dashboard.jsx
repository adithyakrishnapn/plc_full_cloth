import React from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import StatCards from '../components/dashboard/StatCards'
import RuntimeChart from '../components/dashboard/RuntimeChart'
import MonthlyProduction from '../components/dashboard/MonthlyProduction'
import ProductionLog from '../components/dashboard/ProductionLog'
import UtilizationCard from '../components/dashboard/UtilizationCard'
import AlertsCard from '../components/dashboard/AlertsCard'
import LastUpdated from '../components/dashboard/LastUpdated'

export default function Dashboard() {
  const { state, isConnected } = useDashboardData()

  return (
    <div className="space-y-6">
      {!isConnected && (
        <div className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          ⚠️ WebSocket disconnected. Attempting to reconnect...
        </div>
      )}

      <StatCards stats={state.stats} />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <RuntimeChart points={state.runtimePoints} />
        <MonthlyProduction bars={state.productionBars} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ProductionLog rows={state.logRows} />

        <div className="space-y-4">
          <UtilizationCard />
          <AlertsCard />
          <LastUpdated lastUpdated={state.lastUpdated} />
        </div>
      </div>
    </div>
  )
}