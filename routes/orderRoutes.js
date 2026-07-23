// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Import middleware - check your exact file export names
const authMiddleware = require("../middleware/authMiddleware");

// Support flexible export naming (requireAuth or verifyToken)
const requireAuth = authMiddleware.requireAuth || authMiddleware.verifyToken || authMiddleware;
const requireAdmin = authMiddleware.requireAdmin || authMiddleware.isAdmin;

// Sanity Check Debugger (Optional)
if (!orderController.getAllOrdersAdmin) console.error("CRITICAL: orderController.getAllOrdersAdmin is undefined!");
if (!requireAuth) console.error("CRITICAL: requireAuth middleware is undefined!");
if (!requireAdmin) console.error("CRITICAL: requireAdmin middleware is undefined!");

// Customer Routes
router.post("/checkout", requireAuth, orderController.checkout);
router.get("/", requireAuth, orderController.getMyOrders);

// Admin Routes
router.get("/admin/all", requireAuth, requireAdmin, orderController.getAllOrdersAdmin);
router.patch("/:id/status", requireAuth, requireAdmin, orderController.updateStatus);

module.exports = router;