import express from 'express';
import PDFDocument from 'pdfkit';
import Telemetry from '../models/Telemetry.js';
import Process from '../models/Process.js';
import Defect from '../models/Defect.js';

const router = express.Router();

// ✅ FIXED: Simplified to use direct field (production is now direct, not nested)
const getProductionValue = (processDoc) => {
    if (!processDoc) return 0;
    // Try direct field first (after fix)
    if (processDoc.production != null) return processDoc.production;
    // Fallback for legacy data with nested structure
    if (processDoc.fabricProcessed != null) return processDoc.fabricProcessed;
    return 0;
};

const getDurationMinutes = (processDoc) => {
    if (!processDoc) return null;
    if (processDoc.durationMinutes != null) return processDoc.durationMinutes;
    if (processDoc.startTime && processDoc.endTime) {
        return (processDoc.endTime - processDoc.startTime) / 60000;
    }
    return null;
};

const writeProcessReport = (doc, processDoc, defects) => {
    const durationMinutes = getDurationMinutes(processDoc);
    const production = getProductionValue(processDoc);

    doc.fontSize(18).text('Process Report', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(12);
    doc.text(`Process ID: ${processDoc.processId || 'N/A'}`);
    doc.text(`Textile ID: ${processDoc.textileId || 'N/A'}`);
    doc.text(`Start Time: ${processDoc.startTime ? processDoc.startTime.toISOString() : 'N/A'}`);
    doc.text(`End Time: ${processDoc.endTime ? processDoc.endTime.toISOString() : 'N/A'}`);
    doc.text(`Duration (min): ${durationMinutes != null ? durationMinutes.toFixed(2) : 'N/A'}`);
    doc.text(`Production: ${production != null ? production : 'N/A'}`);
    doc.text(`Defects: ${defects.length}`);

    doc.moveDown();
    doc.fontSize(14).text('Defect Details');
    doc.moveDown(0.5);

    if (defects.length === 0) {
        doc.fontSize(12).text('No defects recorded.');
        return;
    }

    defects.forEach((defect, index) => {
        doc.fontSize(12).text(
            `${index + 1}. Count: ${defect.count ?? 'N/A'} | Length: ${defect.lengthAtDetection ?? 'N/A'} | Time: ${defect.timestamp ? defect.timestamp.toISOString() : 'N/A'}`
        );
    });
};

// ✅ Helper function to determine status based on defect count
const getStatusFromDefectCount = (defectCount) => {
    if (defectCount === 0) return 'OK';
    if (defectCount <= 2) return 'WARNING';
    if (defectCount <= 4) return 'WARNING';
    return 'CRITICAL';
};

// ✅ Helper function to write process summary table in PDF
const writeProcessTable = (doc, processes, allDefects) => {
    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 120;
    const col3X = 240;
    const col4X = 360;
    const col5X = 460;
    const rowHeight = 30;
    const colWidth = 90;

    // Header row
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Date', col1X, tableTop);
    doc.text('Batch ID', col2X, tableTop);
    doc.text('Fabric Length', col3X, tableTop);
    doc.text('Defects', col4X, tableTop);
    doc.text('Status', col5X, tableTop);

    // Draw header line
    doc.moveTo(col1X - 10, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Data rows
    doc.fontSize(10).font('Helvetica');
    let currentY = tableTop + 25;

    processes.forEach((proc) => {
        const dateStr = proc.endTime 
            ? proc.endTime.toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB');
        
        const production = getProductionValue(proc);
        const fabricLength = `${production} m`;
        
        // Count defects for this process
        const procDefects = allDefects.filter(d => d.processId === proc.processId);
        const defectCount = procDefects.reduce((sum, d) => sum + (d.count || 1), 0);
        const status = getStatusFromDefectCount(defectCount);

        // Check if we need a new page
        if (currentY > 750) {
            doc.addPage();
            currentY = 50;
            
            // Redraw header on new page
            doc.fontSize(11).font('Helvetica-Bold');
            doc.text('Date', col1X, currentY);
            doc.text('Batch ID', col2X, currentY);
            doc.text('Fabric Length', col3X, currentY);
            doc.text('Defects', col4X, currentY);
            doc.text('Status', col5X, currentY);
            doc.moveTo(col1X - 10, currentY + 15).lineTo(550, currentY + 15).stroke();
            currentY += 25;
            doc.fontSize(10).font('Helvetica');
        }

        // Write row
        doc.text(dateStr, col1X, currentY);
        doc.text(proc.processId || 'N/A', col2X, currentY, { width: 110 });
        doc.text(fabricLength, col3X, currentY);
        doc.text(defectCount.toString(), col4X, currentY);
        
        // Status with color indicator
        const statusColor = status === 'OK' ? 'green' : status === 'CRITICAL' ? 'red' : 'orange';
        doc.text(status, col5X, currentY);

        // Draw row separator
        doc.moveTo(col1X - 10, currentY + 15).lineTo(550, currentY + 15).stroke('gray');
        currentY += rowHeight;
    });

    doc.y = currentY + 10;
};

// ✅ Helper function to write summary statistics
const writeSummaryStats = (doc, processes, allDefects) => {
    const totalProduction = processes.reduce((sum, p) => sum + getProductionValue(p), 0);
    const totalDefects = allDefects.reduce((sum, d) => sum + (d.count || 1), 0);
    const processCount = processes.length;

    doc.moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Summary Statistics');
    doc.fontSize(11).font('Helvetica');
    doc.moveDown(0.3);
    doc.text(`Total Processes: ${processCount}`);
    doc.text(`Total Fabric Length: ${totalProduction.toFixed(2)} m`);
    doc.text(`Total Defects: ${totalDefects}`);
    doc.text(`Average Defects per Process: ${(totalDefects / processCount).toFixed(2)}`);
};

// Dashboard (Consolidated data for frontend)
router.get('/dashboard', async (req, res) => {
    try {
        // Get latest telemetry
        const latestTelemetry = await Telemetry.findOne({ type: 'telemetry' }).sort({ timestamp: -1 });

        // Get current process
        const currentProcess = await Process.findOne({ type: 'process_summary', endTime: null }).sort({ startTime: -1 });

        // Get process history
        const processHistory = await Process.find({ type: 'process_summary', endTime: { $ne: null } })
            .sort({ endTime: -1 })
            .limit(20);

        // ✅ FIXED: Get ALL defects for process history, not just current process
        const processIds = [
            currentProcess?.processId, 
            ...processHistory.map(p => p.processId)
        ].filter(Boolean);
        
        const currentDefects = processIds.length > 0
            ? await Defect.find({ type: 'defect', processId: { $in: processIds } }).sort({ timestamp: -1 })
            : [];

        // Get today's stats
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // ✅ FIXED: Calculate today's production from processes instead of telemetry difference
        // This is more reliable as it sums actual production from completed processes today
        const processesToday = await Process.find({
            type: 'process_summary',
            $or: [
                { startTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: null, startTime: { $lte: endOfDay } }
            ]
        });

        // Calculate total production from all processes today
        let todayProduction = 0;
        processesToday.forEach(proc => {
            const production = getProductionValue(proc);
            todayProduction += production;
        });

        // Fallback: If no processes today, try telemetry difference method
        if (todayProduction === 0) {
            const latestTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $lte: endOfDay } }).sort({ timestamp: -1 });
            const firstTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $gte: startOfDay } }).sort({ timestamp: 1 });
            if (latestTelem && firstTelem) {
                todayProduction = (latestTelem.totalProduction || 0) - (firstTelem.totalProduction || 0);
                if (todayProduction < 0) todayProduction = 0;
            }
        }

        const totalDefectsToday = await Defect.countDocuments({
            type: 'defect',
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        });

        // processesToday already queried above for production calculation
        // ✅ FIXED: Calculate running time correctly for all process scenarios
        let totalRunningTime = 0;
        const now = new Date();
        
        processesToday.forEach(p => {
            let processMinutes = 0;
            
            // Case 1: Process has stored durationMinutes
            if (p.durationMinutes != null) {
                processMinutes = p.durationMinutes;
            }
            // Case 2: Process is completed (has endTime) - calculate duration
            else if (p.endTime && p.startTime) {
                // Only count the portion within today
                const processStart = p.startTime < startOfDay ? startOfDay : p.startTime;
                const processEnd = p.endTime > endOfDay ? endOfDay : p.endTime;
                processMinutes = (processEnd - processStart) / 60000;
            }
            // Case 3: Process is still running (no endTime)
            else if (!p.endTime && p.startTime) {
                // Only count time from start of day (or process start if later)
                const processStart = p.startTime < startOfDay ? startOfDay : p.startTime;
                processMinutes = (now - processStart) / 60000;
            }
            
            // Ensure we don't count negative time
            if (processMinutes > 0) {
                totalRunningTime += processMinutes;
            }
        });

        const minutesSinceStartOfDay = (now - startOfDay) / 60000;
        let totalDowntime = minutesSinceStartOfDay - totalRunningTime;
        if (totalDowntime < 0) totalDowntime = 0;

        const rawUtilization = minutesSinceStartOfDay > 0 ? ((totalRunningTime / minutesSinceStartOfDay) * 100) : 0;
        const utilizationPercent = Math.min(100, Math.max(0, rawUtilization)).toFixed(1);

        // Monthly production (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyProcesses = await Process.find({
            type: 'process_summary',
            endTime: { $ne: null, $gte: sixMonthsAgo, $lte: now }
        });

        const monthMap = new Map();
        monthlyProcesses.forEach(proc => {
            const monthKey = `${proc.endTime.getFullYear()}-${proc.endTime.getMonth()}`;
            const production = getProductionValue(proc);
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + production);
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const productionBars = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            productionBars.push({
                month: months[date.getMonth()],
                value: monthMap.get(monthKey) || 0
            });
        }

        // Get telemetry for last 12 hours for runtime chart
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const telemetryData = await Telemetry.find({
            type: 'telemetry',
            timestamp: { $gte: twelveHoursAgo, $lte: now }
        }).sort({ timestamp: 1 });

        // Calculate runtime points based on machine running status
        // Downsample to max 24 points (one per 30 minutes) for better performance
        const downsampledData = telemetryData.length > 24 
            ? telemetryData.filter((_, idx) => idx % Math.ceil(telemetryData.length / 24) === 0)
            : telemetryData;

        const runtimePoints = downsampledData.length > 0 
            ? downsampledData.map((data, idx) => {
                // Calculate utilization based on machine running status
                // If machine is running, use high utilization (85-95%)
                // If stopped, use low utilization (5-15%)
                const baseUtilization = data.machineRunning ? 90 : 10;
                
                // Map utilization to Y coordinate (inverted: higher utilization = lower Y)
                // Chart expects Y values where lower Y = higher on screen
                const maxY = 80;
                const minY = 14;
                const y = maxY - ((baseUtilization / 100) * (maxY - minY));
                
                return {
                    x: idx * 18,
                    y: y,
                    label: data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                };
            })
            : [];

        res.json({
            timestamp: new Date(),
            latest: latestTelemetry,
            currentProcess,
            processHistory,
            currentDefects,
            productionBars,
            runtimePoints,
            stats: {
                todayProduction: parseFloat(todayProduction.toFixed(2)),
                totalDefectsToday,
                totalRunningTime: Math.floor(totalRunningTime),
                totalDowntime: Math.floor(totalDowntime),
                utilizationPercent: parseFloat(utilizationPercent)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Latest Machine Status (Telemetry)
router.get('/latest', async (req, res) => {
    try {
        const latest = await Telemetry.findOne({ type: 'telemetry' }).sort({ timestamp: -1 });
        res.json(latest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Current Process
router.get('/process/current', async (req, res) => {
    try {
        // Current process usually has endTime: null
        const current = await Process.findOne({ type: 'process_summary', endTime: null }).sort({ startTime: -1 });
        res.json(current);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Latest Completed Process
router.get('/process/latest', async (req, res) => {
    try {
        const latest = await Process.findOne({ type: 'process_summary', endTime: { $ne: null } })
            .sort({ endTime: -1 });
        res.json(latest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Process History (Transform ProductionLog to Process format)
router.get('/process/history', async (req, res) => {
    try {
        const history = await Process.find({ type: 'process_summary', endTime: { $ne: null } })
            .sort({ endTime: -1 })
            .limit(20);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Defect List (Current Process)
router.get('/defects/current', async (req, res) => {
    try {
        // Find current process to get its ID
        const currentProcess = await Process.findOne({ type: 'process_summary', endTime: null }).sort({ startTime: -1 });

        if (!currentProcess) {
            return res.json([]);
        }

        const defects = await Defect.find({
            type: 'defect',
            processId: currentProcess.processId
        }).sort({ timestamp: -1 });

        res.json(defects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ NEW: Get All Defects with Advanced Filters (for Postman testing/debugging)
// Query Parameters (ALL OPTIONAL):
//   - processId: Filter by specific process ID (e.g., "PROC-ABC123-4567")
//   - textileId: Filter by textile ID (e.g., "TEX-260216-173245")
//   - defectId: Filter by defect ID (e.g., "DEFECT-XYZ789-1234")
//   - confidence: Minimum confidence level (0-1, e.g., 0.90 for 90%+)
//   - startDate: Filter from date (ISO format, e.g., "2026-02-15")
//   - endDate: Filter to date (ISO format, e.g., "2026-02-16")
//   - limit: Number of records (default: 100, max: 1000)
//   - skip: Number of records to skip (default: 0)
// Examples:
//   GET /api/defects
//   GET /api/defects?processId=PROC-ABC123-4567
//   GET /api/defects?textileId=TEX-260216-173245
//   GET /api/defects?confidence=0.90
//   GET /api/defects?startDate=2026-02-15&endDate=2026-02-16
//   GET /api/defects?processId=PROC-ABC123-4567&limit=50
router.get('/defects', async (req, res) => {
    try {
        const { 
            processId, 
            textileId, 
            defectId,
            confidence,
            startDate, 
            endDate, 
            limit = 100, 
            skip = 0 
        } = req.query;
        
        // Build query object - always filter by type: "defect"
        const query = { type: 'defect' };
        
        // Filter by processId if provided
        if (processId) {
            query.processId = processId;
        }
        
        // Filter by textileId if provided
        if (textileId) {
            query.textileId = textileId;
        }
        
        // Filter by defectId if provided
        if (defectId) {
            query.defectId = defectId;
        }
        
        // Filter by minimum confidence if provided (0-1 range)
        if (confidence) {
            const minConfidence = parseFloat(confidence);
            if (!isNaN(minConfidence) && minConfidence >= 0 && minConfidence <= 1) {
                query.confidence = { $gte: minConfidence };
            }
        }
        
        // Filter by date range if provided
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                query.timestamp.$lte = endDateObj;
            }
        }
        
        // Validate and set limits
        const parsedLimit = Math.min(parseInt(limit) || 100, 1000);
        const parsedSkip = parseInt(skip) || 0;
        
        // Fetch defects - sorted by latest first
        const defects = await Defect.find(query)
            .sort({ timestamp: -1 })
            .limit(parsedLimit)
            .skip(parsedSkip);
        
        // Get total count for this query
        const total = await Defect.countDocuments(query);
        
        // Get unique values for reference (helps with understanding data)
        const uniqueProcessIds = await Defect.distinct('processId', { type: 'defect' });
        const uniqueTextileIds = await Defect.distinct('textileId', { type: 'defect' });
        
        // Calculate confidence stats
        const stats = await Defect.aggregate([
            { $match: { type: 'defect' } },
            { 
                $group: {
                    _id: null,
                    avgConfidence: { $avg: '$confidence' },
                    minConfidence: { $min: '$confidence' },
                    maxConfidence: { $max: '$confidence' },
                    totalDefects: { $sum: '$count' }
                }
            }
        ]);
        
        res.json({
            success: true,
            count: defects.length,
            total,
            skip: parsedSkip,
            limit: parsedLimit,
            filters: {
                processId: processId || null,
                textileId: textileId || null,
                defectId: defectId || null,
                minConfidence: confidence || null,
                startDate: startDate || null,
                endDate: endDate || null
            },
            stats: stats.length > 0 ? stats[0] : { avgConfidence: 0, minConfidence: 0, maxConfidence: 0, totalDefects: 0 },
            data: defects,
            availableProcessIds: uniqueProcessIds,
            availableTextileIds: uniqueTextileIds
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Dashboard Stats
router.get('/stats/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // ✅ FIXED: Calculate today's production from processes instead of telemetry difference
        const processesToday = await Process.find({
            type: 'process_summary',
            $or: [
                { startTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: null, startTime: { $lte: endOfDay } }
            ]
        });

        // Calculate total production from all processes today
        let todayProduction = 0;
        processesToday.forEach(proc => {
            const production = getProductionValue(proc);
            todayProduction += production;
        });

        // Fallback: If no processes today, try telemetry difference method
        if (todayProduction === 0) {
            const latestTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $lte: endOfDay } }).sort({ timestamp: -1 });
            const firstTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $gte: startOfDay } }).sort({ timestamp: 1 });
            if (latestTelem && firstTelem) {
                todayProduction = (latestTelem.totalProduction || 0) - (firstTelem.totalProduction || 0);
                if (todayProduction < 0) todayProduction = 0;
            }
        }

        const totalDefectsToday = await Defect.countDocuments({
            type: 'defect',
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        });

        // ✅ FIXED: Calculate running time correctly for all process scenarios
        let totalRunningTime = 0;
        const now = new Date();
        
        processesToday.forEach(p => {
            let processMinutes = 0;
            
            // Case 1: Process has stored durationMinutes
            if (p.durationMinutes != null) {
                // Only count the portion within today
                if (p.endTime && p.endTime >= startOfDay && p.startTime <= endOfDay) {
                    const processStart = p.startTime < startOfDay ? startOfDay : p.startTime;
                    const processEnd = p.endTime > endOfDay ? endOfDay : p.endTime;
                    processMinutes = (processEnd - processStart) / 60000;
                } else {
                    processMinutes = p.durationMinutes;
                }
            }
            // Case 2: Process is completed (has endTime) - calculate duration
            else if (p.endTime && p.startTime) {
                // Only count the portion within today
                const processStart = p.startTime < startOfDay ? startOfDay : p.startTime;
                const processEnd = p.endTime > endOfDay ? endOfDay : p.endTime;
                processMinutes = (processEnd - processStart) / 60000;
            }
            // Case 3: Process is still running (no endTime)
            else if (!p.endTime && p.startTime) {
                // Only count time from start of day (or process start if later)
                const processStart = p.startTime < startOfDay ? startOfDay : p.startTime;
                processMinutes = (now - processStart) / 60000;
            }
            
            // Ensure we don't count negative time
            if (processMinutes > 0) {
                totalRunningTime += processMinutes;
            }
        });

        const minutesSinceStartOfDay = (now - startOfDay) / 60000;
        let totalDowntime = minutesSinceStartOfDay - totalRunningTime;
        if (totalDowntime < 0) totalDowntime = 0;

        const rawUtilization = minutesSinceStartOfDay > 0 ? ((totalRunningTime / minutesSinceStartOfDay) * 100) : 0;
        const utilizationPercent = Math.min(100, Math.max(0, rawUtilization)).toFixed(1);

        res.json({
            todayProduction: todayProduction.toFixed(2),
            totalDefectsToday,
            totalRunningTime: Math.floor(totalRunningTime),
            totalDowntime: Math.floor(totalDowntime),
            utilizationPercent
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Latest Process Report (PDF)
router.get('/reports/latest', async (req, res) => {
    try {
        const latest = await Process.findOne({ type: 'process_summary', endTime: { $ne: null } })
            .sort({ endTime: -1 });

        if (!latest) {
            return res.status(404).json({ error: 'No completed process found' });
        }

        const defects = await Defect.find({
            type: 'defect',
            processId: latest.processId
        }).sort({ timestamp: 1 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="process-report-${latest.processId || latest._id}.pdf"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);
        writeProcessReport(doc, latest, defects);
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Process Report by Process ID (PDF)
router.get('/reports/process/:processId', async (req, res) => {
    try {
        const processDoc = await Process.findOne({
            type: 'process_summary',
            processId: req.params.processId
        }).sort({ endTime: -1 });

        if (!processDoc || !processDoc.endTime) {
            return res.status(404).json({ error: 'Completed process not found' });
        }

        const defects = await Defect.find({
            type: 'defect',
            processId: processDoc.processId
        }).sort({ timestamp: 1 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="process-report-${processDoc.processId || processDoc._id}.pdf"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);
        writeProcessReport(doc, processDoc, defects);
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Date Range Report (PDF) - with Table Format
// Query Parameters:
//   - from: Start date (YYYY-MM-DD)
//   - to: End date (YYYY-MM-DD)
// Example: GET /api/reports/range?from=2026-02-15&to=2026-02-16
router.get('/reports/range', async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: 'Both from and to dates are required (format: YYYY-MM-DD)' });
        }

        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const processes = await Process.find({
            type: 'process_summary',
            endTime: { $ne: null },
            $or: [
                { startTime: { $gte: fromDate, $lte: toDate } },
                { endTime: { $gte: fromDate, $lte: toDate } }
            ]
        }).sort({ endTime: -1 });

        const allDefects = await Defect.find({
            type: 'defect',
            timestamp: { $gte: fromDate, $lte: toDate }
        }).sort({ timestamp: 1 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="production-report-${from}-to-${to}.pdf"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // Title
        doc.fontSize(20).text('Production Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).text(`Period: ${from} to ${to}`, { align: 'center' });
        doc.moveDown(2);

        if (processes.length === 0) {
            doc.fontSize(12).text('No processes found in this date range.');
            doc.end();
            return;
        }

        // Write table
        writeProcessTable(doc, processes, allDefects);

        // Write summary statistics
        writeSummaryStats(doc, processes, allDefects);

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ NEW: Today's Production Report (PDF) - with Table Format
// Example: GET /api/reports/today
router.get('/reports/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const processes = await Process.find({
            type: 'process_summary',
            $or: [
                { startTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: null, startTime: { $lte: endOfDay } }
            ]
        }).sort({ endTime: -1, startTime: -1 });

        const allDefects = await Defect.find({
            type: 'defect',
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ timestamp: 1 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="production-report-today.pdf"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // Title
        const today = new Date().toLocaleDateString('en-GB');
        doc.fontSize(20).text('Daily Production Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).text(`Date: ${today}`, { align: 'center' });
        doc.moveDown(2);

        if (processes.length === 0) {
            doc.fontSize(12).text('No processes found for today.');
            doc.end();
            return;
        }

        // Write table
        writeProcessTable(doc, processes, allDefects);

        // Write summary statistics
        writeSummaryStats(doc, processes, allDefects);

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
