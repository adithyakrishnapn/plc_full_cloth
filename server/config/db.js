import mongoose from 'mongoose'
import { env } from './env.js'

const mongoUri = env.MONGODB_URI

export async function connectDb() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set')
  }

  await mongoose.connect(mongoUri)
  return mongoose
}

export { mongoose }
