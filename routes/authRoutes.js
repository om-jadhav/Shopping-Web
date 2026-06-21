// routes/authRoutes.js
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.getMe);

module.exports = router;
