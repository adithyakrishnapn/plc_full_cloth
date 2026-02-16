import mongoose from 'mongoose';
import Base from './Base.js';

const processSchema = new mongoose.Schema({
    processId: String,
    textileId: String,
    startTime: Date,
    endTime: Date,
    durationMinutes: Number,
    production: Number,              // ✅ FIXED: Direct field, not nested
    fabricProcessed: Number          // ✅ FIXED: Direct field
}, { discriminatorKey: 'type' });

export default Base.discriminator('process_summary', processSchema);
