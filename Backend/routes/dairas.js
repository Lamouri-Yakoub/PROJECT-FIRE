const express = require('express');
const router = express.Router();
const dairaController = require('../controllers/dairaController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, dairaController.getDairas);
router.post('/', requireAuth, dairaController.createDaira);
router.put('/:id', requireAuth, dairaController.updateDaira);
router.delete('/:id', requireAuth, dairaController.deleteDaira);

module.exports = router;
