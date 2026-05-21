const mongoose = require('mongoose');

const fireSchema = new mongoose.Schema({
  forest_name: { type: String, required: true },
  daira: { type: String, default: '' },
  commune: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  fire_date: { type: String, required: true }, // Format YYYY-MM-DD
  surface_burned: { type: Number, default: 0 },
  cause: { type: String, default: 'Unknown' },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  notes: { type: String, default: '' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fire', fireSchema);
