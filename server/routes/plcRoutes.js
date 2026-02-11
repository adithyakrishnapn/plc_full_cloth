import { Router } from 'express'
import { PLCData } from '../plc/models.js'

const router = Router()

router.get('/plc-data', async (req, res) => {
  try {
    const data = await PLCData.find().sort({ timestamp: -1 }).limit(100)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/plc-data/latest', async (req, res) => {
  try {
    const data = await PLCData.findOne().sort({ timestamp: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
