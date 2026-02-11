import mongoose from 'mongoose';
import Base from './Base.js';

const telemetrySchema = new mongoose.Schema({
    machineStatus: String,
    machineStatusCode: Number,
    totalProduction: Number,
    fabricLength: Number,
    alarmCode: Number,
    machineRunning: Boolean,
    processStart: Date,
    defectRegister: Number,
    processId: String,
    textileId: String,
    // Inherits timestamp from Base
}, { discriminatorKey: 'type' });

export default Base.discriminator('telemetry', telemetrySchema);
