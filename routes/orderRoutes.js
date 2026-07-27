const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

// Customer Routes
router.post("/checkout", requireAuth, orderController.checkout);
router.get("/", requireAuth, orderController.getMyOrders);

// Admin Routes
router.get("/admin/all", requireAuth, requireAdmin, orderController.getAllOrdersAdmin);
router.patch("/:id/status", requireAuth, requireAdmin, orderController.updateStatus);

module.exports = router;