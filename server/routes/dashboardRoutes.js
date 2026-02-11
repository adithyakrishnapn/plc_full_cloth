import { Router } from 'express'
import { transformPlcDataToDashboard } from '../helpers/plcDashboard.js'

const router = Router()

router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await transformPlcDataToDashboard()
    res.json(dashboardData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
