const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the environment variable if present, or fallback to the local default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';
const backupDir = path.join(__dirname, 'db_backup');

// Ensure the backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected successfully to MongoDB.');
    const db = mongoose.connection.db;
    
    // Retrieve all collections in the database
    const collections = await db.collections();
    console.log(`📦 Found ${collections.length} collections. Starting export...\n`);

    for (let collection of collections) {
      const name = collection.collectionName;
      console.log(`⏳ Exporting collection: "${name}"...`);
      
      // Fetch all documents
      const documents = await collection.find({}).toArray();
      
      // Define filepath and save formatted JSON
      const filePath = path.join(backupDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf-8');
      
      console.log(`   ➡️ Saved ${documents.length} documents to "./db_backup/${name}.json"`);
    }

    console.log('\n🎉 Export complete! All data saved in the "db_backup" folder.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database export failed:', err);
    process.exit(1);
  });
