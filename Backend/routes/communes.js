const express = require('express');
const router = express.Router();
const communeController = require('../controllers/communeController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, communeController.getCommunes);
router.post('/', requireAuth, communeController.createCommune);
router.put('/:id', requireAuth, communeController.updateCommune);
router.delete('/:id', requireAuth, communeController.deleteCommune);

module.exports = router;
