const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/status', optionalAuth, integrationController.getStatus);

module.exports = router;
