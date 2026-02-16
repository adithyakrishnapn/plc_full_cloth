import { Router } from 'express'
import plcRoutes from './plcRoutes.js'
// import dashboardRoutes from './dashboardRoutes.js'  // ✅ REMOVED - Using api.js /dashboard instead
import productionRoutes from './productionRoutes.js'
import alertRoutes from './alertRoutes.js'
import healthRoutes from './healthRoutes.js'
import apiRoutes from './api.js'
import verifyRoutes from './verifyRoutes.js'
import compareRoutes from './compareRoutes.js'

const router = Router()

router.use(plcRoutes)
// router.use(dashboardRoutes)  // ✅ REMOVED - Using api.js version
router.use(productionRoutes)
router.use(alertRoutes)
router.use(healthRoutes)
router.use(apiRoutes)  // ✅ This handles /api/dashboard correctly
router.use('/verify', verifyRoutes)
router.use('/compare', compareRoutes)

export default router
