import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const mongoUri = process.env.MONGODB_URI;

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

// ==================== MODELS ====================

const PLCData = mongoose.model('PLCData', plcDataSchema)
const ProductionLog = mongoose.model('ProductionLog', ProductionLogSchema)

// ==================== SEED DATA ====================

async function seedDatabase() {
  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Clear existing data
    await PLCData.deleteMany({})
    await ProductionLog.deleteMany({})
    console.log('Cleared existing data')

    // Generate 6 months of hourly PLC data
    const plcDataPoints = []
    const now = new Date()
    for (let i = 180 * 24; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000)
      plcDataPoints.push({
        machineStatus: Math.random() > 0.1 ? 'RUNNING' : 'IDLE',
        shiftWorkingHours: Math.random() * 8 + 4,
        totalUptimeHours: Math.random() * 1000 + 500,
        todayProduction: Math.floor(Math.random() * 100 + 20),
        totalProduction: Math.floor(Math.random() * 50000 + 10000),
        fabricLengthMeters: Math.random() * 100 + 50,
        machineSpeed: Math.random() * 50 + 30,
        utilizationPercent: Math.floor(Math.random() * 40 + 60),
        downtimeMinutes: Math.random() * 30,
        alarmCode: Math.random() > 0.95 ? Math.floor(Math.random() * 10) : 0,
        timestamp: date,
      })
    }

    const savedPlcData = await PLCData.insertMany(plcDataPoints)
    console.log(`✓ Inserted ${savedPlcData.length} PLC data points`)

    // Generate production logs with unique batch IDs
    const logRows = []
    for (let i = 0; i < 100; i++) {
      const batchNum = 24061 + i
      logRows.push({
        date: new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        batch: `FX-${batchNum}`,
        length: Math.floor(Math.random() * 150 + 50),
        defects: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0,
        status: Math.random() > 0.8 ? 'CHECK' : 'OK',
        timestamp: new Date(),
      })
    }

    const savedLogs = await ProductionLog.insertMany(logRows)
    console.log(`✓ Inserted ${savedLogs.length} production logs`)

    console.log('\n✓ Database seeding completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('Seeding error:', err)
    process.exit(1)
  }
}

seedDatabase()
