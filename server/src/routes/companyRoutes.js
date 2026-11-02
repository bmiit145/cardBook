const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateAdmin } = require('../middleware/authMiddleware');

router.use(authenticateAdmin);

router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.get('/:id/contacts', companyController.getCompanyContacts);

module.exports = router;

