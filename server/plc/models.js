import mongoose from 'mongoose'
import Base from '../models/Base.js'
import Telemetry from '../models/Telemetry.js'
import Process from '../models/Process.js'
import Defect from '../models/Defect.js'

// ✅ FIXED: Use proper discriminator model instead of duplicate schema
// This model uses the same schema as the PLC server to ensure data consistency
const PLCData = Base

export { PLCData, Process as ProductionLog, Defect as Alert }
