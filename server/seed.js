import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import Base from './models/Base.js';
import Telemetry from './models/Telemetry.js';
import Process from './models/Process.js';
import Defect from './models/Defect.js';

const seedData = async () => {
  try {
    await connectDb();
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Base.deleteMany({});
    console.log('Cleared existing PLC data.');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

    // 1. Create a specific past process
    const pastProcess = await Process.create({
      processId: 'PROC-1001',
      textileId: 'TEX-A1',
      startTime: twoHoursAgo,
      endTime: oneHourAgo,
      durationMinutes: 60,
      production: { fabricProcessed: 1200 },
      fabricProcessed: 1200 // flattened for easier access if needed
    });

    // 2. Create the current running process
    const currentProcess = await Process.create({
      processId: 'PROC-1002',
      textileId: 'TEX-A2',
      startTime: oneHourAgo,
      endTime: null, // Still running
      durationMinutes: null,
      production: { fabricProcessed: 500 },
      fabricProcessed: 500 // partial count
    });

    // 3. Insert Telemetry Data (Historical & Latest)
    // Some data for past process
    await Telemetry.create({
      machineStatus: 'Running',
      machineStatusCode: 1,
      totalProduction: 1000,
      fabricLength: 1000,
      alarmCode: 0,
      machineRunning: true,
      processStart: twoHoursAgo,
      processId: 'PROC-1001',
      textileId: 'TEX-A1',
      timestamp: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000)
    });

    // Latest telemetry for current process
    await Telemetry.create({
      machineStatus: 'Running',
      machineStatusCode: 1,
      totalProduction: 2250, // Cumulative
      fabricLength: 500, // Current textle length
      alarmCode: 0,
      machineRunning: true,
      processStart: oneHourAgo,
      processId: 'PROC-1002', // Current
      textileId: 'TEX-A2',
      timestamp: now
    });

    // 4. Insert Defects
    await Defect.create({
      processId: 'PROC-1001',
      textileId: 'TEX-A1',
      count: 1,
      lengthAtDetection: 150.5,
      timestamp: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000)
    });

    await Defect.create({
      processId: 'PROC-1002',
      textileId: 'TEX-A2',
      count: 1,
      lengthAtDetection: 45.2,
      timestamp: new Date(oneHourAgo.getTime() + 10 * 60 * 1000)
    });

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
