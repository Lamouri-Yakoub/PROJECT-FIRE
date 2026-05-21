const mongoose = require('mongoose');

const communeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  daira: { type: mongoose.Schema.Types.ObjectId, ref: 'Daira', required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Commune', communeSchema);
