const mongoose = require('mongoose');

const dairaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

dairaSchema.virtual('communes', {
  ref: 'Commune',
  localField: '_id',
  foreignField: 'daira'
});

module.exports = mongoose.model('Daira', dairaSchema);
