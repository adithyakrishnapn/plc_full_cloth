import mongoose from 'mongoose';

// Define the base schema
// We assume all documents are in the same collection 'plc_data'
// verify collection name with user if needed, defaulting to 'plc_data'
const options = { discriminatorKey: 'type', collection: 'plc_data', timestamps: true };


const baseSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  // Common fields can simulate query on all types
}, options);

// Export the model
export default mongoose.model('PLCData', baseSchema);
