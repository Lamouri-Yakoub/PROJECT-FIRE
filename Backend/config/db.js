const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Fire = require('../models/Fire');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_fire';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[OK] Connected to MongoDB');
    seedAdmin();
    seedFires();
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
      await Fire.insertMany(sampleFires);
      console.log('[OK] Seeded sample fire history data in MongoDB');
    }
  } catch (err) {
    console.error('[WARN] Seeding fires failed:', err.message);
  }
}

module.exports = mongoose;
