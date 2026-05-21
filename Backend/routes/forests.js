const express = require('express');
const router = express.Router();
const forestController = require('../controllers/forestController');
const { requireAuth } = require('../middleware/auth');

// All forest routes require authentication
router.get('/', requireAuth, forestController.getForests);
router.get('/:id', requireAuth, forestController.getForestById);
router.post('/', requireAuth, forestController.createForest);
router.put('/:id', requireAuth, forestController.updateForest);
router.delete('/:id', requireAuth, forestController.deleteForest);

module.exports = router;
