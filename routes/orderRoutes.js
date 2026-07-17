const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/checkout", requireAuth, orderController.checkout);
router.get("/", requireAuth, orderController.getMyOrders);

module.exports = router;