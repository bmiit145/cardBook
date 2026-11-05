const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { authenticateAdmin, optionalAuth } = require('../middleware/authMiddleware');
const { scanUpload } = require('../middleware/uploadMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { extractTextSchema } = require('../validators/scanValidator');

// Public benchmark / example card metadata
router.get('/benchmark', optionalAuth, scanController.getBenchmarkCards);
router.get('/examples', optionalAuth, scanController.getExamplesCards);

// Scanning business cards strictly requires registered / authenticated user permission
router.post('/ocr', authenticateAdmin, scanUpload, scanController.processOcr);
router.post('/extract', authenticateAdmin, validateBody(extractTextSchema), scanController.extractFields);
router.get('/history', authenticateAdmin, scanController.getHistory);
router.get('/:id', authenticateAdmin, scanController.getScanById);
router.delete('/:id', authenticateAdmin, scanController.deleteScan);

module.exports = router;

