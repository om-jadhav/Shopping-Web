// controllers/orderController.js
const orderModel = require("../models/orderModel");
const profileModel = require("../models/profileModel");

// POST /api/orders/checkout
async function checkout(req, res) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    if (profile?.role === "admin") {
      return res.status(403).json({ error: "Admins cannot place orders." });
    }

    const order = await orderModel.checkoutCart(req.user.id);
    res.status(201).json({ message: "Order placed successfully.", order });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

// GET /api/orders
async function getMyOrders(req, res) {
  try {
    const orders = await orderModel.getOrdersByUserId(req.user.id);
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { checkout, getMyOrders };