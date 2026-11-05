const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateAdmin, optionalAuth } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { contactCreateSchema, contactUpdateSchema, checkDuplicateSchema } = require('../validators/contactValidator');

// Public read / guest browsing (or scoped to user via optionalAuth)
router.get('/export', authenticateAdmin, contactController.exportContacts);
router.get('/', optionalAuth, contactController.getContacts);
router.get('/:id', optionalAuth, contactController.getContactById);

// Write actions require authenticated user
router.post('/', authenticateAdmin, validateBody(contactCreateSchema), contactController.createContact);
router.post('/check-duplicate', authenticateAdmin, validateBody(checkDuplicateSchema), contactController.checkDuplicate);
router.put('/:id', authenticateAdmin, validateBody(contactUpdateSchema), contactController.updateContact);
router.delete('/:id', authenticateAdmin, contactController.deleteContact);

module.exports = router;

