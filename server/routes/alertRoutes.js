import { Router } from 'express'
import { Alert } from '../plc/models.js'

const router = Router()

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50)
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await Alert.find({ resolved: false }).sort({ timestamp: -1 })
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/alerts', async (req, res) => {
  try {
    const alert = new Alert(req.body)
    await alert.save()
    res.status(201).json(alert)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/alerts/:id/resolve', async (req, res) => {
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

export default router
