import { PLCData } from '../plc/models.js'
import Process from '../models/Process.js'

const computeUtilizationFallback = async (now) => {
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const processesToday = await Process.find({
    type: 'process_summary',
    $or: [
      { startTime: { $gte: startOfDay, $lte: endOfDay } },
      { endTime: { $gte: startOfDay, $lte: endOfDay } },
      { endTime: null, startTime: { $lte: endOfDay } },
    ],
  })

  let totalRunningTime = 0
  processesToday.forEach((process) => {
    if (process.durationMinutes) totalRunningTime += process.durationMinutes
    else if (!process.endTime && process.startTime) {
      const diff = (now - process.startTime) / 60000
      totalRunningTime += diff
    }
  })

  const minutesSinceStartOfDay = (now - startOfDay) / 60000
  const rawPercent = minutesSinceStartOfDay > 0
    ? (totalRunningTime / minutesSinceStartOfDay) * 100
    : 0

  const clampedPercent = Math.min(100, Math.max(0, rawPercent))
  return Number(clampedPercent.toFixed(1))
}

export async function transformPlcDataToDashboard() {
  const plcData = await PLCData.findOne().sort({ timestamp: -1 })

  console.log('PLCData found:', !!plcData)
  
  if (!plcData) {
    console.warn('No PLCData found in database')
    return null
  }

  const now = plcData.timestamp instanceof Date ? plcData.timestamp : new Date(plcData.timestamp)
  const utilizationValue = plcData.utilizationPercent != null
    ? Math.min(100, Math.max(0, plcData.utilizationPercent))
    : await computeUtilizationFallback(now)

  const stats = [
    {
      label: 'Machine Status',
      value: plcData.machineStatus,
      accent: plcData.machineStatus === 'RUNNING' ? 'text-emerald-400' : 'text-slate-100',
    },
    {
      label: 'Today Working Hours',
      value: `${Number(plcData.shiftWorkingHours || 0).toFixed(2)} hrs`,
    },
    {
      label: 'Today Production',
      value: `${plcData.todayProduction} rolls`,
    },
    {
      label: 'Utilization',
      value: `${utilizationValue}%`,
      accent: utilizationValue > 80 ? 'text-emerald-400' : 'text-amber-300',
    },
  ]
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

  const hourlyData = await PLCData.find({
    timestamp: { $gte: twelveHoursAgo, $lte: now },
  }).sort({ timestamp: 1 })

  console.log(`[PLC Dashboard] Hourly data found: ${hourlyData.length} records in last 12 hours`)
  
  // Downsample to max 12 points for chart display (one per hour)
  const downsampledData = hourlyData.length > 12 
    ? hourlyData.filter((_, idx) => idx % Math.ceil(hourlyData.length / 12) === 0)
    : hourlyData

  const mapUtilToY = (utilPercent) => {
    const maxY = 80
    const minY = 14
    const clamped = Math.max(0, Math.min(100, utilPercent ?? 0))
    return maxY - ((clamped / 100) * (maxY - minY))
  }

  const runtimePoints = downsampledData.map((data, idx) => ({
    x: idx * 18,
    y: mapUtilToY(data.utilizationPercent),
    label: data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
  }))

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthlyData = await PLCData.aggregate([
    {
      $match: { timestamp: { $gte: sixMonthsAgo, $lte: now } },
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
        },
        totalProduction: { $sum: '$todayProduction' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  console.log(`[PLC Dashboard] Monthly data found: ${monthlyData.length} months with production`)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const monthMap = new Map()
  monthlyData.forEach((entry) => {
    const key = `${entry._id.year}-${entry._id.month}`
    monthMap.set(key, entry.totalProduction)
  })

  const productionBars = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const monthIndex = date.getMonth()
    const key = `${year}-${monthIndex + 1}`

    productionBars.push({
      month: months[monthIndex],
      value: monthMap.get(key) || 0,
    })
  }

  const logRows = await Process.find({
    type: 'process_summary',
    endTime: { $ne: null }
  }).sort({ endTime: -1 }).limit(10)
  
  const formattedLogRows = logRows.map((proc) => ({
    date: proc.endTime ? proc.endTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A',
    batch: proc.processId || 'N/A',
    length: `${(proc.production || proc.fabricProcessed || 0).toFixed(0)} m`,
    defects: 0, // TODO: Query defects for this process if needed
    status: 'OK'
  }))

  console.log(`[PLC Dashboard] Production logs found: ${formattedLogRows.length} records`)

  return {
    stats,
    runtimePoints: runtimePoints.length > 0 ? runtimePoints : [],
    productionBars: productionBars.length > 0 ? productionBars : [],
    logRows: formattedLogRows,
  }
}
