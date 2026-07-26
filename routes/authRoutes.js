// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth: authMiddleware } = require('../middleware/authMiddleware'); // <-- Destructure requireAuth here

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);

// New Auth Routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/update-password', authMiddleware, authController.updatePassword);

module.exports = router;
