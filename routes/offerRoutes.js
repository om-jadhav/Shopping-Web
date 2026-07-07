// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/", requireAuth, offerController.createOffer);
router.get("/", requireAuth, offerController.getOffers);
router.patch("/:id", requireAuth, offerController.updateOffer);
router.delete("/:id", requireAuth, offerController.deleteOffer);
router.delete("/:id/products/:productId", requireAuth, offerController.removeProductFromOffer);

module.exports = router;