import express from 'express'
import http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/dashboard' })

// Middleware
app.use(cors())
app.use(express.json())

// Database Connection
const mongoUri = process.env.MONGODB_URI;

mongoose.connect(mongoUri).then(() => {
  console.log('Connected to MongoDB')
}).catch((err) => {
  console.error('MongoDB connection error:', err)
})

// ==================== SCHEMAS ====================

const plcDataSchema = new mongoose.Schema({
  machineStatus: String,
  shiftWorkingHours: Number,
  totalUptimeHours: Number,
  todayProduction: Number,
  totalProduction: Number,
  fabricLengthMeters: Number,
  machineSpeed: Number,
  utilizationPercent: Number,
  downtimeMinutes: Number,
  alarmCode: Number,
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true })

const ProductionLogSchema = new mongoose.Schema({
  date: Date,
  batch: String,
  length: Number,
  defects: Number,
  status: String,
  timestamp: { type: Date, default: Date.now },
})

const AlertSchema = new mongoose.Schema({
  alarmCode: Number,
  message: String,
  severity: String, // 'INFO', 'WARNING', 'ERROR'
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
})

// ==================== MODELS ====================

const PLCData = mongoose.model('PLCData', plcDataSchema)
const ProductionLog = mongoose.model('ProductionLog', ProductionLogSchema)
const Alert = mongoose.model('Alert', AlertSchema)

// ==================== LIVE UPDATES (MongoDB Change Streams) ====================
const DASHBOARD_POLL_INTERVAL = Number(process.env.DASHBOARD_POLL_INTERVAL || 10000)
let pollIntervalId = null

// ==================== HELPER FUNCTIONS ====================

async function transformPlcDataToDashboard() {
  const plcData = await PLCData.findOne().sort({ timestamp: -1 })

  if (!plcData) {
    return {
      stats: [],
      runtimePoints: [],
      productionBars: [],
      logRows: [],
    }
  }

  // Build stats cards
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

  // Use the timestamp of the latest PLC record as the reference "now"
  const now = plcData.timestamp instanceof Date ? plcData.timestamp : new Date(plcData.timestamp)
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

  const hourlyData = await PLCData.find({
    timestamp: { $gte: twelveHoursAgo, $lte: now },
  }).sort({ timestamp: 1 })

  // Map utilization (0–100) into SVG Y coordinates (approx. 80–14 like the design seed data)
  const mapUtilToY = (utilPercent) => {
    const maxY = 80 // near bottom
    const minY = 14 // near top
    const clamped = Math.max(0, Math.min(100, utilPercent ?? 0))
    return maxY - ((clamped / 100) * (maxY - minY))
  }

  const runtimePoints = hourlyData.map((data, idx) => ({
    x: idx * 18,
    y: mapUtilToY(data.utilizationPercent),
    label: data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
  }))

  // Get monthly production (last 6 months relative to the latest PLC timestamp, always 6 bars)
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

  // Index aggregated data by year-month for quick lookup
  const monthMap = new Map()
  monthlyData.forEach((entry) => {
    const key = `${entry._id.year}-${entry._id.month}`
    monthMap.set(key, entry.totalProduction)
  })

  const productionBars = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const monthIndex = date.getMonth() // 0-based
    const key = `${year}-${monthIndex + 1}`

    productionBars.push({
      month: months[monthIndex],
      value: monthMap.get(key) || 0,
    })
  }

  // Get production logs (last 10 entries)
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

// ==================== REST API ROUTES ====================

// Get all PLC data
app.get('/api/plc-data', async (req, res) => {
  try {
    const data = await PLCData.find().sort({ timestamp: -1 }).limit(100)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get latest PLC data
app.get('/api/plc-data/latest', async (req, res) => {
  try {
    const data = await PLCData.findOne().sort({ timestamp: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    const dashboardData = await transformPlcDataToDashboard()
    res.json(dashboardData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get production logs
app.get('/api/production-logs', async (req, res) => {
  try {
    const logs = await ProductionLog.find().sort({ date: -1 }).limit(50)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add production log
app.post('/api/production-logs', async (req, res) => {
  try {
    const log = new ProductionLog(req.body)
    await log.save()
    res.status(201).json(log)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50)
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get active alerts only
app.get('/api/alerts/active', async (req, res) => {
  try {
    const alerts = await Alert.find({ resolved: false }).sort({ timestamp: -1 })
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create alert
app.post('/api/alerts', async (req, res) => {
  try {
    const alert = new Alert(req.body)
    await alert.save()
    res.status(201).json(alert)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Resolve alert
app.patch('/api/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    )
    res.json(alert)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    mongoConnected: mongoose.connection.readyState === 1,
  })
})

// ==================== WEBSOCKET HANDLING ====================

const connectedClients = new Set()

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  connectedClients.add(ws)

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
    connectedClients.delete(ws)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

function broadcastToClients(message) {
  const data = JSON.stringify(message)
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// ==================== CHANGE STREAM WATCHERS ====================

async function handleDashboardBroadcast() {
  try {
    const dashboardData = await transformPlcDataToDashboard()
    broadcastToClients({
      type: 'UPDATE_ALL',
      payload: dashboardData,
    })
  } catch (err) {
    console.error('Dashboard broadcast error:', err.message)
  }
}

function startPollingFallback() {
  if (pollIntervalId) return
  pollIntervalId = setInterval(handleDashboardBroadcast, DASHBOARD_POLL_INTERVAL)
  console.log(`Polling fallback enabled (${DASHBOARD_POLL_INTERVAL}ms)`) 
}

function setupChangeStreams() {
  try {
    const plcStream = PLCData.watch()
    const logStream = ProductionLog.watch()
    const alertStream = Alert.watch()

    const onStreamError = (err) => {
      console.error('Change stream error:', err.message)
      startPollingFallback()
    }

    plcStream.on('change', async () => {
      await handleDashboardBroadcast()
    })

    logStream.on('change', async () => {
      await handleDashboardBroadcast()
    })

    alertStream.on('change', async (change) => {
      await handleDashboardBroadcast()

      if (change.operationType === 'insert') {
        const alert = change.fullDocument
        broadcastToClients({
          type: 'NEW_ALERT',
          payload: alert,
        })
      }
    })

    plcStream.on('error', onStreamError)
    logStream.on('error', onStreamError)
    alertStream.on('error', onStreamError)

    console.log('MongoDB change streams started')
  } catch (err) {
    console.error('Failed to start change streams:', err.message)
    startPollingFallback()
  }
}

mongoose.connection.once('open', () => {
  setupChangeStreams()
})

// ==================== SERVER START ====================

const PORT = process.env.PORT || 8080

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/dashboard`)
})

export { app, server, wss }
