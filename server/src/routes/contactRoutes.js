const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { contactCreateSchema, contactUpdateSchema, checkDuplicateSchema } = require('../validators/contactValidator');

router.use(authenticateAdmin);

router.post('/', validateBody(contactCreateSchema), contactController.createContact);
router.get('/', contactController.getContacts);
router.get('/export', contactController.exportContacts);
router.post('/check-duplicate', validateBody(checkDuplicateSchema), contactController.checkDuplicate);
router.get('/:id', contactController.getContactById);
router.put('/:id', validateBody(contactUpdateSchema), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;

