const express = require('express');
const router = express.Router();
const fireController = require('../controllers/fireController');
const { requireAuth } = require('../middleware/auth');

// GET /api/fires
router.get('/', requireAuth, fireController.getFires);

// POST /api/fires
router.post('/', requireAuth, fireController.createFire);

// GET /api/fires/stats
router.get('/stats', requireAuth, fireController.getStats);

// PATCH /api/fires/:id/status
router.patch('/:id/status', requireAuth, fireController.updateFireStatus);

// PUT /api/fires/:id
router.put('/:id', requireAuth, fireController.updateFire);

// DELETE /api/fires/:id
router.delete('/:id', requireAuth, fireController.deleteFire);

module.exports = router;
