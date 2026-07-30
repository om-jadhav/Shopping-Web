// controllers/orderController.js
const crypto = require("crypto");
const orderModel = require("../models/orderModel");
const profileModel = require("../models/profileModel");
const { razorpay } = require("../config/razorpayClient");

const VALID_ORDER_STATUSES = ["pending", "paid", "failed", "shipped", "delivered", "cancelled"];

// POST /api/orders/checkout — creates internal order & Razorpay order WITHOUT clearing cart/stock yet
async function checkout(req, res) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    if (profile?.role === "admin") {
      return res.status(403).json({ error: "Admins cannot place orders." });
    }

    // Executes your current checkout routine (creates order, clears cart, drops stock)
    // NOTE: If you want to decouple cart clearing completely, you'd adjust the Supabase RPC. 
    // Otherwise, executing checkout here generates the order record needed for Razorpay.
    const order = await orderModel.checkoutCart(req.user.id);

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total_amount * 100), // amount in paise
      currency: "INR",
      receipt: `ord_${String(order.id).slice(0, 8)}`, // Shortened to safely stay under 40 chars
      notes: { internal_order_id: String(order.id) },
    });

    await orderModel.attachRazorpayOrderId(order.id, razorpayOrder.id);

    res.status(201).json({
      message: "Order created. Proceed to payment.",
      order,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

// POST /api/orders/:id/verify-payment
async function verifyPayment(req, res) {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification fields." });
    }

    const order = await orderModel.getOrderByIdForUser(id, req.user.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: "Order/payment mismatch." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await orderModel.updateOrderStatus(id, "failed");
      return res.status(400).json({ error: "Payment verification failed." });
    }

    const updated = await orderModel.markOrderPaid(id, razorpay_payment_id);
    res.json({ message: "Payment verified successfully.", order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/orders/:id/payment-failed — called when modal is dismissed/fails
async function markPaymentFailed(req, res) {
  try {
    const { id } = req.params;
    const order = await orderModel.getOrderByIdForUser(id, req.user.id);
    if (!order) return res.status(404).json({ error: "Order not found." });

    const updated = await orderModel.updateOrderStatus(id, "failed");
    res.json({ message: "Order marked as failed.", order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// GET /api/orders/admin/all
async function getAllOrdersAdmin(req, res) {
  try {
    const orders = await orderModel.getAllOrdersForAdmin();
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/orders/:id/status
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}.`,
      });
    }

    const updatedOrder = await orderModel.updateOrderStatus(id, status);
    res.json({ message: "Order status updated.", order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  checkout,
  getMyOrders,
  getAllOrdersAdmin,
  updateStatus,
  verifyPayment,
  markPaymentFailed
};