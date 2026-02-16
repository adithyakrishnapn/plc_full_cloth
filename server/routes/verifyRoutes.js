import { Router } from 'express'
import Base from '../models/Base.js'
import Telemetry from '../models/Telemetry.js'
import Process from '../models/Process.js'
import Defect from '../models/Defect.js'

const router = Router()

/**
 * Get database statistics and data verification
 * GET /api/verify/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: 0,
      telemetry: 0,
      defect: 0,
      process_summary: 0,
      by_date: {},
      last_30_minutes: 0
    };

    const allDocs = await Base.find({});
    stats.total = allDocs.length;

    // Count by type
    for (const doc of allDocs) {
      if (doc.type === 'telemetry') stats.telemetry++;
      else if (doc.type === 'defect') stats.defect++;
      else if (doc.type === 'process_summary') stats.process_summary++;
    }

    // Count from last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentDocs = await Base.find({ timestamp: { $gte: thirtyMinutesAgo } });
    stats.last_30_minutes = recentDocs.length;

    res.json({
      message: "Database statistics",
      stats,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error getting stats",
      error: err.message
    });
  }
});

/**
 * Verify data schema consistency
 * GET /api/verify/schema
 */
router.get('/schema', async (req, res) => {
  try {
    const issues = [];
    const warnings = [];

    // Check telemetry documents
    const telemetry = await Telemetry.find().limit(5);
    for (const doc of telemetry) {
      if (!doc.machineStatus) warnings.push(`Telemetry ${doc._id}: Missing machineStatus`);
      if (!doc.timestamp) issues.push(`Telemetry ${doc._id}: Missing timestamp`);
    }

    // Check defect documents
    const defects = await Defect.find().limit(5);
    for (const doc of defects) {
      if (doc.count === null || doc.count === undefined) warnings.push(`Defect ${doc._id}: Missing count`);
      if (!doc.timestamp) issues.push(`Defect ${doc._id}: Missing timestamp`);
    }

    // Check process documents
    const processes = await Process.find().limit(5);
    for (const doc of processes) {
      if (typeof doc.production !== 'number') {
        issues.push(`Process ${doc._id}: production is ${typeof doc.production}, expected number`);
      }
      if (typeof doc.fabricProcessed !== 'number') {
        issues.push(`Process ${doc._id}: fabricProcessed is ${typeof doc.fabricProcessed}, expected number`);
      }
    }

    res.json({
      message: "Schema verification report",
      valid: issues.length === 0,
      issues,
      warnings,
      sample_counts: {
        telemetry_checked: telemetry.length,
        defects_checked: defects.length,
        processes_checked: processes.length
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error verifying schema",
      error: err.message
    });
  }
});

/**
 * Get all document types present in database
 * GET /api/verify/types
 */
router.get('/types', async (req, res) => {
  try {
    const distinctTypes = await Base.distinct('type');
    
    const typeDetails = {};
    for (const type of distinctTypes) {
      const count = await Base.countDocuments({ type });
      const latest = await Base.findOne({ type }).sort({ timestamp: -1 });
      
      typeDetails[type] = {
        count,
        latest: latest ? {
          _id: latest._id,
          timestamp: latest.timestamp,
          processId: latest.processId || null,
          textileId: latest.textileId || null
        } : null
      };
    }

    res.json({
      message: "Document types in database",
      types: distinctTypes,
      details: typeDetails
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error getting types",
      error: err.message
    });
  }
});

/**
 * Get sample data for each type
 * GET /api/verify/samples
 */
router.get('/samples', async (req, res) => {
  try {
    const samples = {};

    // Get sample telemetry
    const telemetrySample = await Telemetry.findOne().sort({ timestamp: -1 });
    if (telemetrySample) {
      samples.telemetry = telemetrySample.toObject();
    }

    // Get sample defect
    const defectSample = await Defect.findOne().sort({ timestamp: -1 });
    if (defectSample) {
      samples.defect = defectSample.toObject();
    }

    // Get sample process
    const processSample = await Process.findOne().sort({ timestamp: -1 });
    if (processSample) {
      samples.process_summary = processSample.toObject();
    }

    res.json({
      message: "Sample documents from database",
      samples,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error getting samples",
      error: err.message
    });
  }
});

/**
 * Compare data from specific process
 * GET /api/verify/process/:processId
 */
router.get('/process/:processId', async (req, res) => {
  try {
    const { processId } = req.params;

    const telemetryRecords = await Telemetry.find({ processId }).sort({ timestamp: -1 });
    const defectRecords = await Defect.find({ processId }).sort({ timestamp: -1 });
    const processSummary = await Process.findOne({ processId });

    res.json({
      message: `Data for process ${processId}`,
      processId,
      summary: processSummary ? {
        _id: processSummary._id,
        startTime: processSummary.startTime,
        endTime: processSummary.endTime,
        durationMinutes: processSummary.durationMinutes,
        production: processSummary.production,
        fabricProcessed: processSummary.fabricProcessed
      } : null,
      telemetry_count: telemetryRecords.length,
      defect_count: defectRecords.length,
      telemetry_sample: telemetryRecords.slice(0, 3),
      defect_sample: defectRecords.slice(0, 3)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error getting process data",
      error: err.message
    });
  }
});

/**
 * Get collection information
 * GET /api/verify/collection
 */
router.get('/collection', async (req, res) => {
  try {
    const collectionName = Base.collection.name;
    const db = Base.collection.db;

    const stats = await db.collection(collectionName).stats();

    res.json({
      message: "Collection information",
      collection_name: collectionName,
      document_count: stats.count,
      storage_size: stats.size,
      average_document_size: Math.floor(stats.size / stats.count),
      indexes: stats.nindexes || 'N/A'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Error getting collection info",
      error: err.message
    });
  }
});

/**
 * Full health check and data consistency report
 * GET /api/verify/health
 */
router.get('/health', async (req, res) => {
  try {
    const allDocs = await Base.find({}).limit(100);
    const issues = [];

    // Check for missing types
    for (const doc of allDocs) {
      if (!doc.type) issues.push(`Document ${doc._id}: Missing type field`);
      if (!doc.timestamp) issues.push(`Document ${doc._id}: Missing timestamp field`);
    }

    // Check for documents without processId (except tests)
    const docsWithoutProcessId = await Base.find({ 
      processId: null,
      type: { $ne: 'test' }
    }).limit(10);

    if (docsWithoutProcessId.length > 0) {
      issues.push(`${docsWithoutProcessId.length} documents missing processId`);
    }

    // Get stats
    const total = await Base.countDocuments({});
    const telemetryCount = await Base.countDocuments({ type: 'telemetry' });
    const defectCount = await Base.countDocuments({ type: 'defect' });
    const processCount = await Base.countDocuments({ type: 'process_summary' });

    const isHealthy = issues.length === 0;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "✅ HEALTHY" : "⚠️ ISSUES FOUND",
      timestamp: new Date(),
      database: {
        total_documents: total,
        telemetry: telemetryCount,
        defect: defectCount,
        process_summary: processCount
      },
      issues,
      issue_count: issues.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Health check error",
      error: err.message
    });
  }
});

export default router
