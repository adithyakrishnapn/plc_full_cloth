import express from 'express'
import http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import PDFDocument from 'pdfkit'

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

// Download Report PDF
app.get('/api/reports/download', (req, res) => {
  try {
    const { from, to } = req.query
    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=FoldX-Report-${from}-to-${to}.pdf`)

    doc.pipe(res)

    // Header
    doc.fillColor('#4338ca').fontSize(24).text('FoldX', { align: 'left' })
    doc.fillColor('#64748b').fontSize(10).text('INDUSTRIAL INTELLIGENCE', 50, 75)

    doc.moveDown(2)
    doc.fillColor('#1e293b').fontSize(18).text('Production & Efficiency Report')
    doc.fontSize(10).fillColor('#64748b').text(`Date Range: ${from} to ${to}`)

    doc.moveDown(2)
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(2)

    // Summary Section
    doc.fillColor('#1e293b').fontSize(14).text('Executive Summary', { underline: true })
    doc.moveDown(1)
    doc.fontSize(10).fillColor('#334155')

    const summaryData = [
      ['Total Uptime', '142.5 Hours'],
      ['Total Production', '2,840 Units'],
      ['Average Utilization', '84.2%'],
      ['Quality Index', '98.5%']
    ]

    summaryData.forEach(([label, value]) => {
      doc.text(`${label}:`, { continued: true, width: 200 })
      doc.text(` ${value}`, { align: 'right' })
      doc.moveDown(0.5)
    })

    doc.moveDown(2)

    // Performance Table
    doc.fillColor('#1e293b').fontSize(14).text('Recent Production Batches', { underline: true })
    doc.moveDown(1)

    // Table Header
    const tableTop = doc.y
    doc.fontSize(10).fillColor('#475569')
    doc.text('Date', 50, tableTop)
    doc.text('Batch ID', 150, tableTop)
    doc.text('Length (m)', 250, tableTop)
    doc.text('Defects', 350, tableTop)
    doc.text('Status', 450, tableTop)

    doc.moveDown(0.5)
    doc.strokeColor('#f1f5f9').moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    // Fake Data Rows
    const fakeLogs = [
      ['12 Jun', 'BX-900', '4,200', '0', 'OK'],
      ['11 Jun', 'BX-899', '3,800', '1', 'OK'],
      ['10 Jun', 'BX-898', '4,500', '0', 'OK'],
      ['09 Jun', 'BX-897', '4,100', '3', 'CHECK'],
      ['08 Jun', 'BX-896', '3,900', '0', 'OK'],
    ]

    fakeLogs.forEach((row, i) => {
      const y = doc.y
      doc.text(row[0], 50, y)
      doc.text(row[1], 150, y)
      doc.text(row[2], 250, y)
      doc.text(row[3], 350, y)
      doc.text(row[4], 450, y)
      doc.moveDown(0.5)
    })

    // Footer
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).fillColor('#94a3b8').text(
        'Generated by FoldX Cloud Intelligence System. This is a confidential document.',
        50,
        780,
        { align: 'center', width: 500 }
      )
    }

    doc.end()
  } catch (err) {
    res.status(500).json({ error: err.message })
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
