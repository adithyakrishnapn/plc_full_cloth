import mongoose from 'mongoose';
import Base from './Base.js';

const processSchema = new mongoose.Schema({
    processId: String,
    textileId: String,
    startTime: Date,
    endTime: Date,
    durationMinutes: Number,
    fabricProcessed: Object, // Can be complex JSON or distinct fields if known. 'production' is actually an object with 'fabricProcessed'?
    // The user prompt listed `production` with `fabricProcessed` then `defect`? 
    // It said: 'process_summary' -> 'durationMinutes', 'production', 'fabricProcessed'
    // I'll assume 'production' is an object containing 'fabricProcessed'. Or 'fabricProcessed' is a direct field.
    // "Values in MongoDB: process_summary... production... fabricProcessed..."
    // It's ambiguous. Let's assume 'fabricProcessed' is a field or part of 'production'.
    // I'll define flexibility here.
    production: {
        fabricProcessed: mongoose.Schema.Types.Mixed
    }
}, { discriminatorKey: 'type' });

export default Base.discriminator('process_summary', processSchema);
