const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/users
exports.getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find({}, '-password_hash').sort({ created_at: -1 });
    const formattedUsers = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      language: u.language,
      created_at: u.created_at.toISOString()
    }));
    return res.json({ users: formattedUsers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { username, email, language } = req.body || {};
    const updateFields = {};
    if (username !== undefined) updateFields.username = username;
    if (email !== undefined) updateFields.email = email;
    if (language !== undefined) updateFields.language = language;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await User.findByIdAndUpdate(userId, updateFields);
    return res.json({ message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id/password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { old_password, new_password } = req.body || {};
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Both passwords required' });
    }

    const user = await User.findById(userId);
    if (!user || !bcrypt.compareSync(old_password, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await User.findByIdAndUpdate(userId, { password_hash: newHash });

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
