const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');

// Batch synchronization for offline mobile queues
router.post('/batch', syncController.batchSync);

// Sync status
router.get('/status', syncController.getStatus);

// Sync downstream changes to mobile
router.get('/changes', syncController.getChanges);

module.exports = router;
