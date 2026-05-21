const mongoose = require('mongoose');

const forestSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  daira: { type: mongoose.Schema.Types.ObjectId, ref: 'Daira', default: null },
  commune: { type: mongoose.Schema.Types.ObjectId, ref: 'Commune', default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Forest', forestSchema);
