import { Router } from 'express'
import { transformPlcDataToDashboard } from '../helpers/plcDashboard.js'
import Telemetry from '../models/Telemetry.js'
import Process from '../models/Process.js'
import Defect from '../models/Defect.js'

const router = Router()

router.get('/dashboard', async (req, res) => {
  try {
    console.log('[Dashboard Route] Fetching dashboard data...')
    
    const latestTelem = await Telemetry.findOne({ type: 'telemetry' }).sort({ timestamp: -1 })
    const currentProcess = await Process.findOne({ type: 'process_summary', endTime: null }).sort({ startTime: -1 })
    
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    
    const processesToday = await Process.find({
      type: 'process_summary',
      $or: [
        { startTime: { $gte: startOfDay, $lte: endOfDay } },
        { endTime: { $gte: startOfDay, $lte: endOfDay } },
        { endTime: null, startTime: { $lte: endOfDay } }
      ]
    })
    
    let totalRunningTime = 0
    processesToday.forEach(p => {
      if (p.durationMinutes) totalRunningTime += p.durationMinutes
      else if (!p.endTime && p.startTime) {
        const now = new Date()
        const diff = (now - p.startTime) / 60000
        totalRunningTime += diff
      }
    })
    
    const now = new Date()
    const minutesSinceStartOfDay = (now - startOfDay) / 60000
    const utilizationPercent = minutesSinceStartOfDay > 0 ? ((totalRunningTime / minutesSinceStartOfDay) * 100).toFixed(1) : 0
    
    const defectsToday = await Defect.countDocuments({
      type: 'defect',
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    })

    // Get telemetry for last 12 hours for runtime chart
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
    const telemetryData = await Telemetry.find({
      type: 'telemetry',
      timestamp: { $gte: twelveHoursAgo, $lte: now }
    }).sort({ timestamp: 1 })

    const runtimePoints = telemetryData.length > 0 
      ? telemetryData.map((data, idx) => {
          const utilizationEstimate = data.machineRunning ? 80 : 20
          return {
            x: idx * 18,
            y: 80 - ((utilizationEstimate / 100) * 66),
            label: data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true })
          }
        })
      : []

    // Get process history for production log
    const recentProcesses = await Process.find({
      type: 'process_summary',
      endTime: { $ne: null }
    }).sort({ endTime: -1 }).limit(10)

    const logRows = recentProcesses.map(proc => ({
      date: proc.endTime ? proc.endTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A',
      batch: proc.processId || 'N/A',
      length: `${proc.production?.fabricProcessed || proc.fabricProcessed || 0} m`,
      defects: 0,
      status: 'OK'
    }))

    // Monthly production (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthlyProcesses = await Process.find({
      type: 'process_summary',
      endTime: { $ne: null },
      endTime: { $gte: sixMonthsAgo, $lte: now }
    })

    const monthMap = new Map()
    monthlyProcesses.forEach(proc => {
      if (proc.endTime) {
        const monthKey = `${proc.endTime.getFullYear()}-${proc.endTime.getMonth()}`
        const production = proc.production?.fabricProcessed || proc.fabricProcessed || 0
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + production)
      }
    })

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const productionBars = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      productionBars.push({
        month: months[date.getMonth()],
        value: monthMap.get(monthKey) || 0
      })
    }
    
    // Calculate total production from all processes today
    const totalProductionToday = processesToday.reduce((sum, proc) => {
      return sum + (proc.production?.fabricProcessed || proc.fabricProcessed || 0)
    }, 0)

    const responseData = {
      stats: [
        {
          label: 'Machine Status',
          value: latestTelem?.machineRunning ? 'RUNNING' : 'STOPPED',
          accent: latestTelem?.machineRunning ? 'text-emerald-400' : 'text-slate-100',
        },
        {
          label: 'Today Working Hours',
          value: `${(totalRunningTime / 60).toFixed(2)} hrs`,
        },
        {
          label: 'Today Production',
          value: `${totalProductionToday.toFixed(0)} m`,
        },
        {
          label: 'Utilization',
          value: `${utilizationPercent}%`,
          accent: Number(utilizationPercent) > 80 ? 'text-emerald-400' : 'text-amber-300',
        },
      ],
      runtimePoints,
      productionBars,
      logRows
    }
    
    console.log('[Dashboard Route] Returning data with:', {
      statsCount: responseData.stats.length,
      pointsCount: responseData.runtimePoints.length,
      barsCount: responseData.productionBars.length,
      logsCount: responseData.logRows.length
    })
    
    res.json(responseData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
