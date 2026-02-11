import { PLCData, ProductionLog } from '../plc/models.js'

export async function transformPlcDataToDashboard() {
  const plcData = await PLCData.findOne().sort({ timestamp: -1 })

  if (!plcData) {
    return {
      stats: [],
      runtimePoints: [],
      productionBars: [],
      logRows: [],
    }
  }

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
      value: `${plcData.utilizationPercent}%`,
      accent: plcData.utilizationPercent > 80 ? 'text-emerald-400' : 'text-amber-300',
    },
  ]

  const now = plcData.timestamp instanceof Date ? plcData.timestamp : new Date(plcData.timestamp)
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

  const hourlyData = await PLCData.find({
    timestamp: { $gte: twelveHoursAgo, $lte: now },
  }).sort({ timestamp: 1 })

  const mapUtilToY = (utilPercent) => {
    const maxY = 80
    const minY = 14
    const clamped = Math.max(0, Math.min(100, utilPercent ?? 0))
    return maxY - ((clamped / 100) * (maxY - minY))
  }

  const runtimePoints = hourlyData.map((data, idx) => ({
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

  const logRows = await ProductionLog.find().sort({ date: -1 }).limit(10)
  const formattedLogRows = logRows.map((log) => ({
    date: log.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    batch: log.batch,
    length: `${log.length} m`,
    defects: log.defects,
    status: log.defects > 0 ? 'CHECK' : 'OK',
  }))

  return {
    stats,
    runtimePoints: runtimePoints.length > 0 ? runtimePoints : [],
    productionBars: productionBars.length > 0 ? productionBars : [],
    logRows: formattedLogRows,
  }
}
