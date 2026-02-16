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
        const processIds = [currentProcess?.processId, ...processHistory.map(p => p.processId)].filter(Boolean);
        const currentDefects = processIds.length > 0
            ? await Defect.find({ type: 'defect', processId: { $in: processIds } }).sort({ timestamp: -1 })
            : [];

        // Get today's stats
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const latestTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $lte: endOfDay } }).sort({ timestamp: -1 });
        const firstTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $gte: startOfDay } }).sort({ timestamp: 1 });

        let todayProduction = 0;
        if (latestTelem && firstTelem) {
            todayProduction = (latestTelem.totalProduction || 0) - (firstTelem.totalProduction || 0);
            if (todayProduction < 0) todayProduction = 0;
        }

        const totalDefectsToday = await Defect.countDocuments({
            type: 'defect',
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        });

        const processesToday = await Process.find({
            type: 'process_summary',
            $or: [
                { startTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: null, startTime: { $lte: endOfDay } }
            ]
        });

        let totalRunningTime = 0;
        processesToday.forEach(p => {
            if (p.durationMinutes) totalRunningTime += p.durationMinutes;
            else if (!p.endTime && p.startTime) {
                const now = new Date();
                const diff = (now - p.startTime) / 60000;
                totalRunningTime += diff;
            }
        });

        const now = new Date();
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

// Dashboard Stats
router.get('/stats/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const latestTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $lte: endOfDay } }).sort({ timestamp: -1 });
        const firstTelem = await Telemetry.findOne({ type: 'telemetry', timestamp: { $gte: startOfDay } }).sort({ timestamp: 1 });

        let todayProduction = 0;
        if (latestTelem && firstTelem) {
            todayProduction = (latestTelem.totalProduction || 0) - (firstTelem.totalProduction || 0);
            if (todayProduction < 0) todayProduction = 0;
        }

        const totalDefectsToday = await Defect.countDocuments({
            type: 'defect',
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        });

        const processesToday = await Process.find({
            type: 'process_summary',
            $or: [
                { startTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: { $gte: startOfDay, $lte: endOfDay } },
                { endTime: null, startTime: { $lte: endOfDay } }
            ]
        });

        let totalRunningTime = 0;
        processesToday.forEach(p => {
            if (p.durationMinutes) totalRunningTime += p.durationMinutes;
            else if (!p.endTime && p.startTime) {
                const now = new Date();
                const diff = (now - p.startTime) / 60000;
                totalRunningTime += diff;
            }
        });

        const now = new Date();
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

// Date Range Report (PDF)
router.get('/reports/range', async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: 'Both from and to dates are required' });
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

        doc.fontSize(20).text('Production Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Period: ${from} to ${to}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(14).text(`Total Processes: ${processes.length}`);
        doc.text(`Total Defects: ${allDefects.length}`);
        doc.moveDown(1.5);

        if (processes.length === 0) {
            doc.fontSize(12).text('No processes found in this date range.');
        } else {
            processes.forEach((proc, index) => {
                const durationMinutes = getDurationMinutes(proc);
                const production = getProductionValue(proc);
                const procDefects = allDefects.filter(d => d.processId === proc.processId).length;

                doc.fontSize(14).text(`Process ${index + 1}: ${proc.processId || proc._id}`);
                doc.fontSize(10);
                doc.text(`  Textile ID: ${proc.textileId || 'N/A'}`);
                doc.text(`  Start: ${proc.startTime ? proc.startTime.toISOString() : 'N/A'}`);
                doc.text(`  End: ${proc.endTime ? proc.endTime.toISOString() : 'N/A'}`);
                doc.text(`  Duration (min): ${durationMinutes != null ? durationMinutes.toFixed(2) : 'N/A'}`);
                doc.text(`  Production: ${production != null ? production : 'N/A'}`);
                doc.text(`  Defects: ${procDefects}`);
                doc.moveDown(0.5);
            });
        }

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
