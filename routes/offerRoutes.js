// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { requireAuth } = require("../middleware/authMiddleware");

// Secure all campaign operations for logged-in admins
router.post("/", requireAuth, offerController.createOffer);
router.get("/", requireAuth, offerController.getOffers);         
router.delete("/:id", requireAuth, offerController.deleteOffer); 

// 🚀 NEW: Remove a single product from an active campaign campaign
router.delete("/:id/products/:productId", requireAuth, offerController.removeProductFromOffer);

module.exports = router;