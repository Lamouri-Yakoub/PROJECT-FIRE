const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to:', MONGO_URI);
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  const firesCol = db.collection('fires');
  const count = await firesCol.countDocuments();
  console.log('Total fires in collection:', count);
  
  const sample = await firesCol.findOne({ organismes: { $exists: true } });
  console.log('Sample fire document:', JSON.stringify(sample, null, 2));
  
  await mongoose.disconnect();
}

main();
