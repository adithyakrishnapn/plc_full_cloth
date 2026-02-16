import { Router } from 'express'
import Process from '../models/Process.js'
import Telemetry from '../models/Telemetry.js'
import Defect from '../models/Defect.js'

const router = Router()

// Get all process history
router.get('/history/processes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const skip = parseInt(req.query.skip) || 0
    
    const processes = await Process.find({ type: 'process_summary' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
    
    const total = await Process.countDocuments({ type: 'process_summary' })
    
    res.json({
      count: processes.length,
      total,
      skip,
      limit,
      data: processes
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get all telemetry history
router.get('/history/telemetry', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const skip = parseInt(req.query.skip) || 0
    
    const telemetry = await Telemetry.find({ type: 'telemetry' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
    
    const total = await Telemetry.countDocuments({ type: 'telemetry' })
    
    res.json({
      count: telemetry.length,
      total,
      skip,
      limit,
      data: telemetry
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get all defect history
router.get('/history/defects', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const skip = parseInt(req.query.skip) || 0
    
    const defects = await Defect.find({ type: 'defect' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
    
    const total = await Defect.countDocuments({ type: 'defect' })
    
    res.json({
      count: defects.length,
      total,
      skip,
      limit,
      data: defects
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get complete history summary (counts)
router.get('/history/summary', async (req, res) => {
  try {
    const processCount = await Process.countDocuments({ type: 'process_summary' })
    const telemetryCount = await Telemetry.countDocuments({ type: 'telemetry' })
    const defectCount = await Defect.countDocuments({ type: 'defect' })
    
    const latestProcess = await Process.findOne({ type: 'process_summary' }).sort({ timestamp: -1 })
    const latestTelemetry = await Telemetry.findOne({ type: 'telemetry' }).sort({ timestamp: -1 })
    const latestDefect = await Defect.findOne({ type: 'defect' }).sort({ timestamp: -1 })
    
    res.json({
      summary: {
        totalProcesses: processCount,
        totalTelemetry: telemetryCount,
        totalDefects: defectCount
      },
      latestRecords: {
        latestProcess,
        latestTelemetry,
        latestDefect
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get history by date range
router.get('/history/range', async (req, res) => {
  try {
    const { startDate, endDate, type = 'all' } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const dateFilter = { timestamp: { $gte: start, $lte: end } }
    
    const results = {}
    
    if (type === 'all' || type === 'processes') {
      results.processes = await Process.find({
        type: 'process_summary',
        ...dateFilter
      }).sort({ timestamp: -1 })
    }
    
    if (type === 'all' || type === 'telemetry') {
      results.telemetry = await Telemetry.find({
        type: 'telemetry',
        ...dateFilter
      }).sort({ timestamp: -1 })
    }
    
    if (type === 'all' || type === 'defects') {
      results.defects = await Defect.find({
        type: 'defect',
        ...dateFilter
      }).sort({ timestamp: -1 })
    }
    
    res.json({
      dateRange: { startDate, endDate, type },
      ...results
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get specific process details
router.get('/history/process/:id', async (req, res) => {
  try {
    const process = await Process.findById(req.params.id)
    if (!process) {
      return res.status(404).json({ error: 'Process not found' })
    }
    
    // Get associated telemetry and defects for this process
    const telemetry = await Telemetry.find({ processId: process.processId }).sort({ timestamp: 1 })
    const defects = await Defect.find({ processId: process.processId }).sort({ timestamp: -1 })
    
    res.json({
      process,
      telemetryCount: telemetry.length,
      telemetry: telemetry.slice(-10), // Last 10 telemetry records
      defectCount: defects.length,
      defects
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
