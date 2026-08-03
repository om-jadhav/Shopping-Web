const express = require("express");
const router = express.Router();

const controller = require("../controllers/printingPriceController");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

router.get("/", controller.getPrices);

router.patch(
  "/",
  requireAuth,
  requireAdmin,
  controller.updatePrices
);

module.exports = router;