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

    // Create processes across last 6 months for monthly production chart
    const processHistory = [];
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const processDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      const numProcesses = 3 + Math.floor(Math.random() * 3); // 3-5 processes per month
      
      for (let i = 0; i < numProcesses; i++) {
        const startTime = new Date(processDate.getTime() + i * 8 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + (2 + Math.random()) * 60 * 60 * 1000);
        const fabricProcessed = 800 + Math.floor(Math.random() * 600); // 800-1400m
        
        processHistory.push({
          processId: `PROC-${processDate.getFullYear()}${String(processDate.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(3,'0')}`,
          textileId: `TEX-${String.fromCharCode(65 + i)}${monthOffset}`,
          startTime,
          endTime,
          durationMinutes: (endTime - startTime) / 60000,
          production: { fabricProcessed },
          fabricProcessed
        });
      }
    }

    // Create current running process (last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    processHistory.push({
      processId: 'PROC-CURRENT',
      textileId: 'TEX-CURRENT',
      startTime: oneHourAgo,
      endTime: null, // Still running
      durationMinutes: null,
      production: { fabricProcessed: 450 },
      fabricProcessed: 450
    });

    await Process.insertMany(processHistory);
    console.log(`Created ${processHistory.length} processes`);

    // Create telemetry data for last 12 hours
    const telemetryData = [];
    for (let i = 0; i < 12; i++) {
      const timestamp = new Date(now.getTime() - (12 - i) * 60 * 60 * 1000);
      telemetryData.push({
        machineStatus: i % 3 === 0 ? 'Stopped' : 'Running',
        machineStatusCode: i % 3 === 0 ? 0 : 1,
        totalProduction: 1800 + i * 150,
        fabricLength: 400 + i * 50,
        alarmCode: 0,
        machineRunning: i % 3 !== 0,
        processStart: oneHourAgo,
        processId: i < 6 ? `PROC-${processHistory[0].processId}` : 'PROC-CURRENT',
        textileId: i < 6 ? processHistory[0].textileId : 'TEX-CURRENT',
        timestamp
      });
    }

    await Telemetry.insertMany(telemetryData);
    console.log(`Created ${telemetryData.length} telemetry records`);

    // Create some defects
    await Defect.create([
      {
        processId: processHistory[0].processId,
        textileId: processHistory[0].textileId,
        count: 1,
        lengthAtDetection: 150.5,
        timestamp: processHistory[0].startTime
      },
      {
        processId: 'PROC-CURRENT',
        textileId: 'TEX-CURRENT',
        count: 1,
        lengthAtDetection: 45.2,
        timestamp: new Date(oneHourAgo.getTime() + 10 * 60 * 1000)
      }
    ]);
    console.log('Created defect records');

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
