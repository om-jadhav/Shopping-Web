const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");

// Logged-in user profile
router.get("/", requireAuth, profileController.getProfile);

// Update profile
router.patch("/", requireAuth, profileController.updateProfile);

module.exports = router;