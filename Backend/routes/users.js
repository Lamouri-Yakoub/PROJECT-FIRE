const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// GET /api/users (Admin only)
router.get('/', requireAuth, userController.getUsers);

// PUT /api/users/:id (Self or Admin)
router.put('/:id', requireAuth, userController.updateUser);

// PUT /api/users/:id/password (Self only)
router.put('/:id/password', requireAuth, userController.changePassword);

// DELETE /api/users/:id (Admin only)
router.delete('/:id', requireAuth, userController.deleteUser);

module.exports = router;
