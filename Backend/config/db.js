const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Fire = require('../models/Fire');
const Forest = require('../models/Forest');
const Daira = require('../models/Daira');
const Commune = require('../models/Commune');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[OK] Connected to MongoDB');
    await seedAdmin();
    await seedForests();
    await seedFires();
    await updateExtinctionStatusMigration();
  })
  .catch((err) => {
    console.error('[ERROR] MongoDB connection failed:', err.message);
  });

async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      const admin = new User({
        username: 'admin',
        email: 'admin@projectfire.dz',
        password_hash: passwordHash,
        role: 'admin',
        language: 'fr'
      });
      await admin.save();
      console.log('[OK] Created default admin user (admin / admin123)');
    }
  } catch (err) {
    console.error('[WARN] Seeding admin failed:', err.message);
  }
}

async function seedFires() {
  try {
    const count = await Fire.countDocuments();
    if (count === 0) {
      const sampleFires = [
        { forest_name: 'MAHOUNA', daira: 'GUELMA', commune: 'GUELMA', latitude: 36.45, longitude: 7.43, fire_date: '2024-07-15', surface_burned: 120.5, cause: 'Natural', severity: 'high', notes: 'Major summer fire' },
        { forest_name: 'BENI SALAH', daira: 'BOUCHEGOUF', commune: 'BOUCHEGOUF', latitude: 36.46, longitude: 7.71, fire_date: '2024-08-02', surface_burned: 85.0, cause: 'Human', severity: 'critical', notes: 'Arson suspected' },
        { forest_name: 'DJ DEBAGH', daira: 'HAMMAM DEBAGH', commune: 'HAMMAM DEBAGH', latitude: 36.47, longitude: 7.23, fire_date: '2024-06-20', surface_burned: 45.0, cause: 'Natural', severity: 'medium', notes: 'Lightning strike' },
        { forest_name: 'DJ HALOUF', daira: 'GUELMA', commune: 'AIN BEN BEIDA', latitude: 36.50, longitude: 7.35, fire_date: '2024-09-10', surface_burned: 200.0, cause: 'Unknown', severity: 'critical', notes: 'Large fire' },
        { forest_name: 'EL MINA', daira: 'OUED ZENATI', commune: 'OUED ZENATI', latitude: 36.30, longitude: 7.17, fire_date: '2024-07-28', surface_burned: 30.0, cause: 'Human', severity: 'low', notes: 'Small brush fire' },
        { forest_name: 'FEKIRINA', daira: 'KHEZARAS', commune: 'KHEZARAS', latitude: 36.41, longitude: 7.55, fire_date: '2025-06-10', surface_burned: 95.0, cause: 'Natural', severity: 'high', notes: 'Dry season fire' },
        { forest_name: 'SILA', daira: 'GUELMA', commune: 'GUELMA', latitude: 36.44, longitude: 7.40, fire_date: '2025-07-05', surface_burned: 150.0, cause: 'Human', severity: 'critical', notes: 'Agricultural fire spread' },
        { forest_name: 'RAGOUBA', daira: 'BOUCHEGOUF', commune: 'BOUCHEGOUF', latitude: 36.48, longitude: 7.68, fire_date: '2025-05-15', surface_burned: 22.0, cause: 'Natural', severity: 'low', notes: 'Minor fire' },
        { forest_name: 'OUED FRAGHA', daira: 'GUELMA', commune: 'BELKHEIR', latitude: 36.42, longitude: 7.48, fire_date: '2025-08-20', surface_burned: 180.0, cause: 'Unknown', severity: 'high', notes: 'Fire near valley' },
        { forest_name: 'MOUBIA', daira: 'HAMMAM DEBAGH', commune: 'AIN LARBI', latitude: 36.52, longitude: 7.30, fire_date: '2024-08-15', surface_burned: 65.0, cause: 'Human', severity: 'medium', notes: 'Campfire spread' }
      ];
      // Resolve forest references for seeded fires
      const updatedSampleFires = await Promise.all(sampleFires.map(async (f) => {
        const forestDoc = await Forest.findOne({ name: f.forest_name.toUpperCase().trim() });
        return {
          ...f,
          forest: forestDoc ? forestDoc._id : null
        };
      }));
      await Fire.insertMany(updatedSampleFires);
      console.log('[OK] Seeded sample fire history data in MongoDB');
    }
  } catch (err) {
    console.error('[WARN] Seeding fires failed:', err.message);
  }
}

async function seedForests() {
  try {
    const count = await Forest.countDocuments();
    if (count === 0) {
      const csvPath = path.join(__dirname, '..', '..', 'clean_dataset.csv');
      if (!fs.existsSync(csvPath)) {
        console.warn(`[WARN] clean_dataset.csv not found at ${csvPath}, falling back to minimal seeding`);
        // Fallback to a minimal list of sample forests
        const sampleForests = [
          { name: 'MAHOUNA', daira: 'GUELMA', commune: 'GUELMA', latitude: 36.45, longitude: 7.43 },
          { name: 'BENI SALAH', daira: 'BOUCHEGOUF', commune: 'BOUCHEGOUF', latitude: 36.46, longitude: 7.71 },
          { name: 'DJ DEBAGH', daira: 'HAMMAM DEBAGH', commune: 'HAMMAM DEBAGH', latitude: 36.47, longitude: 7.23 },
          { name: 'DJ HALOUF', daira: 'GUELMA', commune: 'AIN BEN BEIDA', latitude: 36.50, longitude: 7.35 },
          { name: 'EL MINA', daira: 'OUED ZENATI', commune: 'OUED ZENATI', latitude: 36.30, longitude: 7.17 },
          { name: 'FEKIRINA', daira: 'KHEZARAS', commune: 'KHEZARAS', latitude: 36.41, longitude: 7.55 },
          { name: 'SILA', daira: 'GUELMA', commune: 'GUELMA', latitude: 36.44, longitude: 7.40 },
          { name: 'RAGOUBA', daira: 'BOUCHEGOUF', commune: 'BOUCHEGOUF', latitude: 36.48, longitude: 7.68 },
          { name: 'OUED FRAGHA', daira: 'GUELMA', commune: 'BELKHEIR', latitude: 36.42, longitude: 7.48 },
          { name: 'MOUBIA', daira: 'HAMMAM DEBAGH', commune: 'AIN LARBI', latitude: 36.52, longitude: 7.30 }
        ];
        
        // Seed Dairas first for the fallback
        for (const f of sampleForests) {
          let dairaDoc = await Daira.findOne({ name: f.daira });
          if (!dairaDoc) {
            dairaDoc = new Daira({ name: f.daira });
            await dairaDoc.save();
          }
          let communeDoc = await Commune.findOne({ name: f.commune });
          if (!communeDoc) {
            communeDoc = new Commune({ name: f.commune, daira: dairaDoc._id });
            await communeDoc.save();
          }
          const forest = new Forest({
            name: f.name,
            daira: dairaDoc._id,
            commune: communeDoc._id,
            latitude: f.latitude,
            longitude: f.longitude
          });
          await forest.save();
        }
        return;
      }

      console.log('[INFO] Seeding Dairas, Communes, and Forests from clean_dataset.csv...');
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      const dataLines = lines.slice(1);

      // Maps to collect unique entries
      const uniqueDairas = new Set();
      const uniqueCommunes = new Map(); // name -> dairaName
      const uniqueForests = new Map(); // name -> { daira, commune, longitude, latitude }

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 5) continue;

        const dairaName = parts[0].trim().toUpperCase();
        const communeName = parts[1].trim().toUpperCase();
        const forestName = parts[2].trim().toUpperCase();
        const lonStr = parts[3].trim();
        const latStr = parts[4].trim();

        if (!forestName) continue;

        if (dairaName) uniqueDairas.add(dairaName);
        if (communeName && dairaName) uniqueCommunes.set(communeName, dairaName);

        const lon = lonStr ? parseFloat(lonStr) : null;
        const lat = latStr ? parseFloat(latStr) : null;
        const hasCoords = (lon !== null && !isNaN(lon)) && (lat !== null && !isNaN(lat));

        const existing = uniqueForests.get(forestName);
        if (!existing) {
          uniqueForests.set(forestName, {
            name: forestName,
            daira: dairaName,
            commune: communeName,
            longitude: hasCoords ? lon : null,
            latitude: hasCoords ? lat : null
          });
        } else {
          if (hasCoords && (existing.longitude === null || existing.latitude === null)) {
            existing.longitude = lon;
            existing.latitude = lat;
          }
          if (!existing.daira && dairaName) existing.daira = dairaName;
          if (!existing.commune && communeName) existing.commune = communeName;
        }
      }

      // 1. Seed Dairas
      const dairaMap = new Map(); // name -> ObjectId
      for (const dName of uniqueDairas) {
        let dairaDoc = await Daira.findOne({ name: dName });
        if (!dairaDoc) {
          dairaDoc = new Daira({ name: dName });
          await dairaDoc.save();
        }
        dairaMap.set(dName, dairaDoc._id);
      }

      // 2. Seed Communes
      const communeMap = new Map(); // name -> ObjectId
      for (const [cName, dName] of uniqueCommunes.entries()) {
        let communeDoc = await Commune.findOne({ name: cName });
        if (!communeDoc) {
          const dairaId = dairaMap.get(dName);
          if (dairaId) {
            communeDoc = new Commune({ name: cName, daira: dairaId });
            await communeDoc.save();
          }
        }
        if (communeDoc) {
          communeMap.set(cName, communeDoc._id);
        }
      }

      // 3. Seed Forests
      const forestList = Array.from(uniqueForests.values());
      for (const fData of forestList) {
        let forestDoc = await Forest.findOne({ name: fData.name });
        if (!forestDoc) {
          const dairaId = dairaMap.get(fData.daira);
          const communeId = communeMap.get(fData.commune);
          forestDoc = new Forest({
            name: fData.name,
            daira: dairaId || null,
            commune: communeId || null,
            latitude: fData.latitude,
            longitude: fData.longitude
          });
          await forestDoc.save();
        }
      }

      console.log(`[OK] Successfully seeded database from CSV: ${uniqueDairas.size} Dairas, ${uniqueCommunes.size} Communes, ${uniqueForests.size} Forests.`);
    }
  } catch (err) {
    console.error('[WARN] Seeding forests/dairas/communes failed:', err.message);
  }
}

async function updateExtinctionStatusMigration() {
  try {
    const result = await Fire.updateMany(
      {
        extinction_date: { $ne: null },
        status: { $ne: 'extinguished' }
      },
      {
        $set: { status: 'extinguished' }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`[MIGRATION] Updated ${result.modifiedCount} fires with extinction dates to 'extinguished' status.`);
    }
  } catch (err) {
    console.error('[WARN] Extinction status migration failed:', err.message);
  }
}

module.exports = mongoose;
