const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  language: { type: String, default: 'fr' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
