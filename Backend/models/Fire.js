const mongoose = require('mongoose');

const fireSchema = new mongoose.Schema({
  forest: { type: mongoose.Schema.Types.ObjectId, ref: 'Forest', required: true },
  fire_date: { type: String, required: true }, // Format YYYY-MM-DD
  surface_burned: { type: Number, default: 0 },
  cause: { type: String, default: 'Unknown' },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  notes: { type: String, default: '' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fire', fireSchema);
