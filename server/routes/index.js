import { Router } from 'express'
import plcRoutes from './plcRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import productionRoutes from './productionRoutes.js'
import alertRoutes from './alertRoutes.js'
import healthRoutes from './healthRoutes.js'
import apiRoutes from './api.js'

const router = Router()

router.use(plcRoutes)
router.use(dashboardRoutes)
router.use(productionRoutes)
router.use(alertRoutes)
router.use(healthRoutes)
router.use(apiRoutes)

export default router
