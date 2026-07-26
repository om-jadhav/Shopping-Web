// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

router.post("/", requireAuth, requireAdmin, offerController.createOffer);
router.get("/", requireAuth, requireAdmin, offerController.getOffers);
router.patch("/:id", requireAuth, requireAdmin, offerController.updateOffer);
router.delete("/:id", requireAuth, requireAdmin, offerController.deleteOffer);
router.delete("/:id/products/:productId", requireAuth, requireAdmin, offerController.removeProductFromOffer);

module.exports = router;