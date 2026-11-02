const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { loginSchema, changePasswordSchema } = require('../validators/authValidator');

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateAdmin, authController.getMe);
router.post('/change-password', authenticateAdmin, validateBody(changePasswordSchema), authController.changePassword);

module.exports = router;

