import { connectDb, mongoose } from './config/db.js'
import Base from './models/Base.js'
import Telemetry from './models/Telemetry.js'
import Process from './models/Process.js'
import Defect from './models/Defect.js'
import { PLCData, ProductionLog, Alert } from './plc/models.js'

const clearDatabase = async () => {
  try {
    await connectDb()
    console.log('Connected to MongoDB')

    const results = await Promise.all([
      Base.deleteMany({}),
      Telemetry.deleteMany({}),
      Process.deleteMany({}),
      Defect.deleteMany({}),
      PLCData.deleteMany({}),
      ProductionLog.deleteMany({}),
      Alert.deleteMany({}),
    ])

    const deletedCounts = results.map((result) => result.deletedCount || 0)
    const totalDeleted = deletedCounts.reduce((sum, count) => sum + count, 0)

    console.log(`Deleted ${totalDeleted} documents across all collections`)
    process.exit(0)
  } catch (err) {
    console.error('Failed to clear database:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

clearDatabase()
