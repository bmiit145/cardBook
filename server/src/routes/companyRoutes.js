const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateAdmin, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, companyController.getCompanies);
router.get('/:id/contacts', optionalAuth, companyController.getCompanyContacts);

router.post('/', authenticateAdmin, companyController.createCompany);
router.put('/:id', authenticateAdmin, companyController.updateCompany);

module.exports = router;

