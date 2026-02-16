import { connectDb, mongoose } from './config/db.js'
import Base from './models/Base.js'

/**
 * Migration Script: Fix old PLC data schema
 * 
 * This script updates existing documents to match the new schema structure:
 * - Adds `type` field if missing
 * - Fixes nested `production` field to direct field
 * - Ensures all documents are in correct collection
 */

async function migrate() {
  try {
    console.log('🔄 Starting database migration...\n');

    await connectDb();
    console.log('✅ Connected to database\n');

    // 1. Find documents without type field (old schema)
    const oldDocs = await Base.collection.find({ type: { $exists: false } }).toArray();
    console.log(`Found ${oldDocs.length} documents without 'type' field`);

    if (oldDocs.length > 0) {
      console.log('Analyzing documents...');
      
      // Categorize documents
      let telemetryCount = 0;
      let processCount = 0;
      let defectCount = 0;

      for (const doc of oldDocs) {
        let type = 'unknown';

        // Detect type based on fields
        if (doc.machineStatus && doc.machineStatusCode) {
          type = 'telemetry';
          telemetryCount++;
        } else if (doc.startTime && doc.endTime && doc.durationMinutes) {
          type = 'process_summary';
          processCount++;
        } else if (doc.count && doc.lengthAtDetection) {
          type = 'defect';
          defectCount++;
        }

        // Update document with type
        if (type !== 'unknown') {
          await Base.collection.updateOne(
            { _id: doc._id },
            { $set: { type } }
          );
        }
      }

      console.log(`  ✓ Telemetry docs: ${telemetryCount}`);
      console.log(`  ✓ Process docs: ${processCount}`);
      console.log(`  ✓ Defect docs: ${defectCount}\n`);
    }

    // 2. Fix nested production fields
    const nestedProduction = await Base.find({
      'production.fabricProcessed': { $exists: true }
    });

    console.log(`Found ${nestedProduction.length} documents with nested production field`);
    
    if (nestedProduction.length > 0) {
      for (const doc of nestedProduction) {
        const fabricProcessed = doc.production.fabricProcessed;
        
        await Base.updateOne(
          { _id: doc._id },
          {
            $set: { fabricProcessed },
            $unset: { 'production.fabricProcessed': 1 }
          }
        );
      }
      console.log(`  ✓ Fixed ${nestedProduction.length} nested production fields\n`);
    }

    // 3. Verify collection consistency
    const allDocs = await Base.collection.find({}).toArray();
    const stats = {
      telemetry: 0,
      defect: 0,
      process_summary: 0,
      unknown: 0
    };

    for (const doc of allDocs) {
      if (!doc.type) {
        stats.unknown++;
      } else {
        stats[doc.type] = (stats[doc.type] || 0) + 1;
      }
    }

    console.log('📊 Final collection stats:');
    console.log(`  ✓ Total documents: ${allDocs.length}`);
    console.log(`  ├─ Telemetry: ${stats.telemetry}`);
    console.log(`  ├─ Defect: ${stats.defect}`);
    console.log(`  ├─ Process Summary: ${stats.process_summary}`);
    
    if (stats.unknown > 0) {
      console.log(`  └─ Unknown (needs fixing): ${stats.unknown}`);
    } else {
      console.log(`  └─ Unknown: 0 ✅`);
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run migration
console.log('='.repeat(60));
console.log('Migration: PLC Database Schema Update');
console.log('='.repeat(60) + '\n');

migrate();
