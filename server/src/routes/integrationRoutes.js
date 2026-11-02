const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { authenticateAdmin } = require('../middleware/authMiddleware');

router.use(authenticateAdmin);

router.get('/status', integrationController.getStatus);
router.post('/sheets/retry', integrationController.retryFailedSheetsSync);
router.post('/sheets/sync/:id', integrationController.syncSingleContact);

module.exports = router;

