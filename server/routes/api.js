import express from 'express';
import Telemetry from '../models/Telemetry.js';
import Process from '../models/Process.js';
import Defect from '../models/Defect.js';

const router = express.Router();

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

// Process History
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

        const utilizationPercent = minutesSinceStartOfDay > 0 ? ((totalRunningTime / minutesSinceStartOfDay) * 100).toFixed(1) : 0;

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

export default router;
