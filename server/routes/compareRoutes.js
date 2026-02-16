import { Router } from 'express'
import axios from 'axios'
import Base from '../models/Base.js'
import Telemetry from '../models/Telemetry.js'
import Process from '../models/Process.js'
import Defect from '../models/Defect.js'

const router = Router()

// Configuration
const PLC_SERVER_URL = process.env.PLC_SERVER_URL || 'http://localhost:3000'

/**
 * Compare data counts between PLC and Hosted servers
 * GET /api/compare/counts
 */
router.get('/counts', async (req, res) => {
  try {
    // Get counts from hosted server (this server)
    const hostedCounts = {
      total: await Base.countDocuments({}),
      telemetry: await Base.countDocuments({ type: 'telemetry' }),
      defect: await Base.countDocuments({ type: 'defect' }),
      process_summary: await Base.countDocuments({ type: 'process_summary' })
    };

    // Get counts from PLC server
    let plcCounts = null;
    let plcAccessible = true;
    
    try {
      const plcResponse = await axios.get(`${PLC_SERVER_URL}/test-data/status`);
      plcCounts = plcResponse.data.last_30_minutes || {};
    } catch (err) {
      plcAccessible = false;
    }

    const match = plcAccessible && 
                  plcCounts.total === hostedCounts.total &&
                  JSON.stringify(plcCounts.by_type) === JSON.stringify({
                    telemetry: hostedCounts.telemetry,
                    defect: hostedCounts.defect,
                    process_summary: hostedCounts.process_summary
                  });

    res.json({
      message: "Data count comparison",
      match: match ? "✅ MATCHED" : "❌ MISMATCH",
      servers: {
        hosted: hostedCounts,
        plc: plcCounts,
        plc_accessible: plcAccessible
      },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error comparing counts",
      error: err.message
    });
  }
});

/**
 * Compare latest records from both servers
 * GET /api/compare/latest
 */
router.get('/latest', async (req, res) => {
  try {
    // Get from hosted server
    const hostedLatest = {
      telemetry: await Telemetry.findOne().sort({ timestamp: -1 }),
      defect: await Defect.findOne().sort({ timestamp: -1 }),
      process: await Process.findOne().sort({ timestamp: -1 })
    };

    // Get from PLC server
    let plcLatest = null;
    let plcAccessible = true;
    
    try {
      const plcResponse = await axios.get(`${PLC_SERVER_URL}/test-data/latest`);
      plcLatest = plcResponse.data.latest;
    } catch (err) {
      plcAccessible = false;
    }

    // Compare timestamps
    const comparison = {
      telemetry: {
        hosted: hostedLatest.telemetry ? {
          id: hostedLatest.telemetry._id,
          timestamp: hostedLatest.telemetry.timestamp,
          type: hostedLatest.telemetry.type
        } : null,
        plc: plcLatest && plcLatest.telemetry ? {
          id: plcLatest.telemetry._id,
          timestamp: plcLatest.telemetry.timestamp,
          type: plcLatest.telemetry.type
        } : null
      },
      defect: {
        hosted: hostedLatest.defect ? {
          id: hostedLatest.defect._id,
          timestamp: hostedLatest.defect.timestamp,
          type: hostedLatest.defect.type
        } : null,
        plc: plcLatest && plcLatest.defect ? {
          id: plcLatest.defect._id,
          timestamp: plcLatest.defect.timestamp,
          type: plcLatest.defect.type
        } : null
      },
      process: {
        hosted: hostedLatest.process ? {
          id: hostedLatest.process._id,
          timestamp: hostedLatest.process.timestamp,
          type: hostedLatest.process.type
        } : null,
        plc: plcLatest && plcLatest.process_summary ? {
          id: plcLatest.process_summary._id,
          timestamp: plcLatest.process_summary.timestamp,
          type: plcLatest.process_summary.type
        } : null
      }
    };

    res.json({
      message: "Latest records comparison",
      plc_accessible: plcAccessible,
      comparison,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error comparing latest",
      error: err.message
    });
  }
});

/**
 * Sync test: Insert data on PLC, verify on Hosted server
 * POST /api/compare/sync-test
 */
router.post('/sync-test', async (req, res) => {
  try {
    // 1. Count before
    const countBefore = await Base.countDocuments({});

    // 2. Insert data via PLC server
    let insertResult = null;
    try {
      const plcInsertResponse = await axios.get(`${PLC_SERVER_URL}/test-data/telemetry`);
      insertResult = plcInsertResponse.data;
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: "❌ Cannot reach PLC server",
        error: err.message
      });
    }

    // 3. Wait a bit for database replication
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Count after
    const countAfter = await Base.countDocuments({});

    // 5. Verify
    const synced = countAfter > countBefore;

    res.json({
      success: synced,
      message: synced ? "✅ Data synced successfully" : "❌ Data not synced",
      test: {
        action: "Inserted telemetry via PLC server",
        count_before: countBefore,
        count_after: countAfter,
        increase: countAfter - countBefore,
        synced
      },
      inserted_data: insertResult?.data,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Sync test error",
      error: err.message
    });
  }
});

/**
 * Data distribution report
 * GET /api/compare/distribution
 */
router.get('/distribution', async (req, res) => {
  try {
    const hostedDocs = await Base.find({}).select('type timestamp');
    
    const distribution = {
      by_type: {},
      by_hour: {},
      by_day: {}
    };

    for (const doc of hostedDocs) {
      // By type
      if (!distribution.by_type[doc.type]) {
        distribution.by_type[doc.type] = 0;
      }
      distribution.by_type[doc.type]++;

      // By hour
      const hour = new Date(doc.timestamp).toISOString().substring(0, 13);
      if (!distribution.by_hour[hour]) {
        distribution.by_hour[hour] = 0;
      }
      distribution.by_hour[hour]++;

      // By day
      const day = new Date(doc.timestamp).toISOString().substring(0, 10);
      if (!distribution.by_day[day]) {
        distribution.by_day[day] = 0;
      }
      distribution.by_day[day]++;
    }

    res.json({
      message: "Data distribution analysis",
      total_documents: hostedDocs.length,
      distribution,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error analyzing distribution",
      error: err.message
    });
  }
});

/**
 * Get detailed comparison report
 * GET /api/compare/report
 */
router.get('/report', async (req, res) => {
  try {
    // Hosted server stats
    const hostedTotal = await Base.countDocuments({});
    const hostedTelemetry = await Base.countDocuments({ type: 'telemetry' });
    const hostedDefect = await Base.countDocuments({ type: 'defect' });
    const hostedProcess = await Base.countDocuments({ type: 'process_summary' });

    // PLC server stats
    let plcStats = null;
    let plcReachable = true;

    try {
      const plcResponse = await axios.get(`${PLC_SERVER_URL}/test-data/status`);
      plcStats = plcResponse.data.last_30_minutes;
    } catch (err) {
      plcReachable = false;
    }

    // Data quality checks
    const qualityChecks = {
      all_have_type: false,
      all_have_timestamp: false,
      processes_have_production: false,
      all_have_process_id: false
    };

    // Check type field
    const noType = await Base.countDocuments({ type: { $exists: false } });
    qualityChecks.all_have_type = noType === 0;

    // Check timestamp
    const noTimestamp = await Base.countDocuments({ timestamp: { $exists: false } });
    qualityChecks.all_have_timestamp = noTimestamp === 0;

    // Check process production field
    const processesWithoutProduction = await Process.countDocuments({
      production: { $exists: false }
    });
    qualityChecks.processes_have_production = processesWithoutProduction === 0;

    // Check processId (for non-test docs)
    const docsWithoutProcessId = await Base.countDocuments({
      processId: { $exists: false },
      type: { $ne: 'test' }
    });
    qualityChecks.all_have_process_id = docsWithoutProcessId === 0;

    const report = {
      timestamp: new Date(),
      servers: {
        plc_reachable: plcReachable,
        hosted_reachable: true
      },
      hosted_server: {
        total: hostedTotal,
        telemetry: hostedTelemetry,
        defect: hostedDefect,
        process_summary: hostedProcess
      },
      plc_server: plcStats,
      data_quality: qualityChecks,
      quality_score: Math.round(
        (Object.values(qualityChecks).filter(v => v).length / 4) * 100
      )
    };

    const isHealthy = plcReachable && 
                      report.hosted_server.total > 0 && 
                      Object.values(qualityChecks).every(v => v);

    res.json({
      status: isHealthy ? "✅ HEALTHY" : "⚠️ WARNINGS",
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error generating report",
      error: err.message
    });
  }
});

export default router
