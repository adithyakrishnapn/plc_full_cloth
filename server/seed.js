import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import Base from './models/Base.js';
import Telemetry from './models/Telemetry.js';
import Process from './models/Process.js';
import Defect from './models/Defect.js';
import { PLCData } from './plc/models.js';

const seedData = async () => {
  try {
    await connectDb();
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Base.deleteMany({});
    console.log('Cleared existing PLC data.');

    const now = new Date();

    const randomId = (prefix) => {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      const suffix = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${rand}-${suffix}`;
    };

    // Create processes for today only
    const processHistory = [];
    const processesToday = 6;
    for (let i = 0; i < processesToday; i++) {
      const startTime = new Date(now.getTime() - (processesToday - i + 2) * 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (1.5 + Math.random()) * 60 * 60 * 1000);
      const fabricProcessed = 800 + Math.floor(Math.random() * 600); // 800-1400m

      processHistory.push({
        type: 'process_summary',  // ✅ FIXED: Missing type field
        processId: randomId('PROC'),
        textileId: randomId('TEX'),
        startTime,
        endTime,
        durationMinutes: (endTime - startTime) / 60000,
        production: fabricProcessed,  // ✅ FIXED: Direct number, not nested object
        fabricProcessed,
        timestamp: endTime  // ✅ FIXED: Missing timestamp
      });
    }

    // Create current running process (last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentProcessId = randomId('PROC');
    const currentTextileId = randomId('TEX');
    processHistory.push({
      type: 'process_summary',  // ✅ FIXED: Missing type field
      processId: currentProcessId,
      textileId: currentTextileId,
      startTime: oneHourAgo,
      endTime: null, // Still running
      durationMinutes: null,
      production: 450,  // ✅ FIXED: Direct number, not nested object
      fabricProcessed: 450,
      timestamp: now  // ✅ FIXED: Missing timestamp
    });

    await Process.insertMany(processHistory);
    console.log(`Created ${processHistory.length} processes`);

    // ✅ VERIFY: Check if processes were inserted with type field
    const processCount = await Process.countDocuments({ type: 'process_summary' });
    const processSamples = await Process.find({ type: 'process_summary' }).limit(2);
    console.log('[Seed Verification] Processes:', {
      count: processCount,
      samples: processSamples.map(p => ({ type: p.type, production: p.production, endTime: p.endTime }))
    });

    // Create telemetry data for today only
    const telemetryData = [];
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const rangeMs = Math.max(1, now.getTime() - startOfDay.getTime());
    const stepMs = rangeMs / 12;
    for (let i = 0; i < 12; i++) {
      const timestamp = new Date(startOfDay.getTime() + stepMs * (i + 1));
      telemetryData.push({
        type: 'telemetry',  // ✅ FIXED: Missing type field
        machineStatus: i % 3 === 0 ? 'Stopped' : 'Running',
        machineStatusCode: i % 3 === 0 ? 0 : 1,
        totalProduction: 1800 + i * 150,
        fabricLength: 400 + i * 50,
        alarmCode: 0,
        machineRunning: i % 3 !== 0,
        processStart: i % 3 !== 0 ? 1 : 0,  // ✅ FIXED: Should be 0/1, not Date
        processId: i < 6 ? processHistory[0].processId : currentProcessId,
        textileId: i < 6 ? processHistory[0].textileId : currentTextileId,
        timestamp
      });
    }

    await Telemetry.insertMany(telemetryData);
    console.log(`Created ${telemetryData.length} telemetry records`);

    // ✅ VERIFY: Check if telemetry was inserted with type field
    const telemetryCount = await Telemetry.countDocuments({ type: 'telemetry' });
    const telemetrySamples = await Telemetry.find({ type: 'telemetry' }).limit(2);
    console.log('[Seed Verification] Telemetry:', {
      count: telemetryCount,
      samples: telemetrySamples.map(t => ({ type: t.type, timestamp: t.timestamp }))
    });

    // Create PLCData records for today (required by dashboard)
    const plcDataEntries = [];
    let cumulativeProduction = 0;
    for (let i = 0; i < 12; i++) {
      const timestamp = new Date(startOfDay.getTime() + stepMs * (i + 1));
      const productionDelta = 50 + Math.floor(Math.random() * 120);
      cumulativeProduction += productionDelta;
      const utilizationPercent = 30 + Math.floor(Math.random() * 65);
      const shiftWorkingHours = (timestamp.getTime() - startOfDay.getTime()) / 3600000;

      plcDataEntries.push({
        machineStatus: utilizationPercent > 20 ? 'RUNNING' : 'STOPPED',
        shiftWorkingHours,
        totalUptimeHours: shiftWorkingHours,
        todayProduction: cumulativeProduction,
        totalProduction: 5000 + cumulativeProduction,
        fabricLengthMeters: 1000 + cumulativeProduction,
        machineSpeed: 45 + Math.floor(Math.random() * 20),
        utilizationPercent,
        downtimeMinutes: Math.floor(Math.random() * 10),
        alarmCode: 0,
        timestamp
      });
    }

    await PLCData.insertMany(plcDataEntries);
    console.log(`Created ${plcDataEntries.length} PLC data records`);

    // Create some defects for each process
    const defectRecords = [];
    for (const proc of processHistory.slice(0, -1)) {  // All except current running
      for (let j = 0; j < 2; j++) {
        const defectTime = new Date(proc.startTime.getTime() + Math.random() * (proc.endTime - proc.startTime));
        defectRecords.push({
          type: 'defect',  // ✅ FIXED: Missing type field
          processId: proc.processId,
          textileId: proc.textileId,
          count: Math.floor(1 + Math.random() * 3),
          lengthAtDetection: 50 + Math.random() * 400,
          defectId: `DEFECT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          confidence: 0.75 + Math.random() * 0.25,
          timestamp: defectTime
        });
      }
    }
    
    // Add defects for current running process
    for (let j = 0; j < 1; j++) {
      defectRecords.push({
        type: 'defect',
        processId: currentProcessId,
        textileId: currentTextileId,
        count: 1,
        lengthAtDetection: 45.2,
        timestamp: new Date(oneHourAgo.getTime() + 10 * 60 * 1000)
      });
    }

    await Defect.insertMany(defectRecords);
    console.log(`Created ${defectRecords.length} defect records`);

    // ✅ VERIFY: Check if defects were inserted with type field
    const defectCount = await Defect.countDocuments({ type: 'defect' });
    const defectSamples = await Defect.find({ type: 'defect' }).limit(2);
    console.log('[Seed Verification] Defects:', {
      count: defectCount,
      samples: defectSamples.map(d => ({ type: d.type, processId: d.processId, count: d.count }))
    });

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
