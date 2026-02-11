import { Router } from 'express'
import { ProductionLog } from '../plc/models.js'

const router = Router()

router.get('/production-logs', async (req, res) => {
  try {
    const logs = await ProductionLog.find().sort({ date: -1 }).limit(50)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/production-logs', async (req, res) => {
  try {
    const log = new ProductionLog(req.body)
    await log.save()
    res.status(201).json(log)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
