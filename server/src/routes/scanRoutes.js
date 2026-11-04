const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { scanUpload } = require('../middleware/uploadMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { extractTextSchema } = require('../validators/scanValidator');

router.use(authenticateAdmin);

router.post('/ocr', scanUpload, scanController.processOcr);
router.post('/extract', validateBody(extractTextSchema), scanController.extractFields);
router.get('/benchmark', scanController.getBenchmarkCards);
router.get('/examples', scanController.getExamplesCards);
router.get('/history', scanController.getHistory);
router.get('/:id', scanController.getScanById);
router.delete('/:id', scanController.deleteScan);

module.exports = router;

