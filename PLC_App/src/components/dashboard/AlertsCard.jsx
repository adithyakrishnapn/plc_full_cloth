import React, { useEffect, useState } from 'react'
import API_CONFIG from '../../config/api'

export default function AlertsCard() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/alerts/active`)
        const data = await response.json()
        if (Array.isArray(data)) {
          setAlerts(data)
          setError('')
        } else {
          setAlerts([])
          setError(data?.error || 'Failed to load alerts')
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err)
        setAlerts([])
        setError('Failed to fetch alerts')
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <h3 className="text-sm font-semibold text-slate-200">Active Alerts</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {loading ? (
          <li className="text-slate-400">Loading alerts...</li>
        ) : error ? (
          <li className="text-amber-400">{error}</li>
        ) : alerts.length === 0 ? (
          <li className="text-emerald-400">✓ No active alerts</li>
        ) : (
          alerts.map((alert) => (
            <li
              key={alert._id}
              className={`rounded px-2 py-1 ${
                alert.severity === 'ERROR'
                  ? 'bg-red-500/10 text-red-400'
                  : alert.severity === 'WARNING'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {alert.message}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
