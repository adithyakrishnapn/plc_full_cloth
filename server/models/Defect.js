import mongoose from 'mongoose';
import Base from './Base.js';

const defectSchema = new mongoose.Schema({
    processId: String,
    textileId: String,
    count: Number,
    lengthAtDetection: Number,
    timestamp: { type: Date, default: Date.now }
}, { discriminatorKey: 'type' });

export default Base.discriminator('defect', defectSchema);
