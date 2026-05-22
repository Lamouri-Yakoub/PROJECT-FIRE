const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';
const backupDir = path.join(__dirname, 'db_backup');

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected successfully to MongoDB.');
    const db = mongoose.connection.db;

    if (!fs.existsSync(backupDir)) {
      console.error(`❌ Backup directory not found at: ${backupDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${files.length} backup files. Starting import...\n`);

    for (let file of files) {
      const collectionName = file.replace('.json', '');
      const filePath = path.join(backupDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`⚠️ Skipping empty or invalid collection: "${collectionName}"`);
        continue;
      }

      console.log(`⏳ Importing collection: "${collectionName}" (${data.length} docs)...`);
      
      // Clear existing records in the collection to prevent duplicates
      await db.collection(collectionName).deleteMany({});

      // Parse fields like _id to native MongoDB ObjectIds
      const parsedData = data.map(doc => {
        // Convert string _id back to ObjectId
        if (doc._id) {
          if (typeof doc._id === 'object' && doc._id.$oid) {
            doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
          } else if (typeof doc._id === 'string') {
            doc._id = new mongoose.Types.ObjectId(doc._id);
          }
        }
        
        // Convert reference IDs (like forest, commune, daira) to ObjectIds if they are strings
        ['forest', 'commune', 'daira', 'created_by'].forEach(field => {
          if (doc[field] && typeof doc[field] === 'string') {
            doc[field] = new mongoose.Types.ObjectId(doc[field]);
          }
        });

        // Convert date strings back to native Dates
        ['declaration_date', 'intervention_date', 'extinction_date', 'created_at'].forEach(field => {
          if (doc[field] && typeof doc[field] === 'string') {
            doc[field] = new Date(doc[field]);
          }
        });

        return doc;
      });

      await db.collection(collectionName).insertMany(parsedData);
      console.log(`   ➡️ Restored "${collectionName}" successfully.`);
    }

    console.log('\n🎉 Database import/restore completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database import failed:', err);
    process.exit(1);
  });
