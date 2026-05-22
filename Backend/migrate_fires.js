/**
 * migrate_fires.js
 *
 * Standalone migration script to convert old string-based essence and organismes
 * fields (e.g., "SF+PC" or "CL+MAQ") to native arrays in MongoDB.
 *
 * Usage:
 *   node migrate_fires.js
 */

const mongoose = require('mongoose');
const Fire = require('./models/Fire');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';

async function runMigration() {
  try {
    console.log('[MIGRATION] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[MIGRATION] Connected successfully.');

    const db = mongoose.connection.db;
    const collection = db.collection('fires');
    const fires = await collection.find({}).toArray();
    console.log(`[MIGRATION] Found ${fires.length} total fires in database.`);

    let updatedCount = 0;

    for (const fire of fires) {
      let changed = false;
      let newEssence = fire.essence;
      let newOrganismes = fire.organismes;

      // Migrate essence (vegetation type)
      if (typeof fire.essence === 'string') {
        newEssence = fire.essence.split('+').map(s => s.trim()).filter(Boolean);
        changed = true;
      } else if (Array.isArray(fire.essence) && fire.essence.length === 1 && typeof fire.essence[0] === 'string' && fire.essence[0].includes('+')) {
        newEssence = fire.essence[0].split('+').map(s => s.trim()).filter(Boolean);
        changed = true;
      }

      // Migrate organismes
      if (typeof fire.organismes === 'string') {
        newOrganismes = fire.organismes.split('+').map(s => s.trim()).filter(Boolean);
        changed = true;
      } else if (Array.isArray(fire.organismes) && fire.organismes.length === 1 && typeof fire.organismes[0] === 'string' && fire.organismes[0].includes('+')) {
        newOrganismes = fire.organismes[0].split('+').map(s => s.trim()).filter(Boolean);
        changed = true;
      }

      if (changed) {
        await collection.updateOne(
          { _id: fire._id },
          { $set: { essence: newEssence, organismes: newOrganismes } }
        );
        updatedCount++;
        console.log(`  -> Migrated fire ID ${fire._id}: essence=${JSON.stringify(newEssence)}, organismes=${JSON.stringify(newOrganismes)}`);
      }
    }

    console.log(`\n[MIGRATION] Migration complete. Updated ${updatedCount} fire records.`);
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] Disconnected from MongoDB.');
  }
}

runMigration();
