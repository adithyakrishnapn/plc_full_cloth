import mongoose from 'mongoose'

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

const productionLogSchema = new mongoose.Schema({
  date: Date,
  batch: String,
  length: Number,
  defects: Number,
  status: String,
  timestamp: { type: Date, default: Date.now },
})

const alertSchema = new mongoose.Schema({
  alarmCode: Number,
  message: String,
  severity: String,
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
})

const PLCData = mongoose.models.PLCData || mongoose.model('PLCData', plcDataSchema)
const ProductionLog = mongoose.models.ProductionLog || mongoose.model('ProductionLog', productionLogSchema)
const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema)

export { PLCData, ProductionLog, Alert }
