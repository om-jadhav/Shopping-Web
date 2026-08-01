// controllers/orderController.js
const crypto = require("crypto");
const orderModel = require("../models/orderModel");
const profileModel = require("../models/profileModel");
const { razorpay } = require("../config/razorpayClient");

const VALID_ORDER_STATUSES = ["pending", "paid", "failed", "shipped", "delivered", "cancelled"];

async function checkout(req, res) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    if (profile?.role === "admin") {
      return res.status(403).json({ error: "Admins cannot place customer orders." });
    }

    const order = await orderModel.createPendingOrder(req.user.id);

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total_amount * 100),
      currency: "INR",
      receipt: `ord_${String(order.id).slice(0, 8)}`,
      notes: { internal_order_id: String(order.id) },
    });

    await orderModel.attachRazorpayOrderId(order.id, razorpayOrder.id);

    res.status(201).json({
      message: "Draft order created. Complete payment.",
      order,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function verifyPayment(req, res) {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay payment data." });
    }

    const order = await orderModel.getOrderByIdForUser(id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Order is not awaiting payment." });
    }

    if (order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: "Razorpay order mismatch." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await orderModel.markOrderFailed(id, req.user.id);
      return res.status(400).json({ error: "Payment signature verification failed." });
    }

    const paidOrder = await orderModel.finalizeOrderAfterPayment(id, req.user.id, razorpay_payment_id);

    res.status(200).json({
      message: "Payment verified. Order placed successfully.",
      order: paidOrder,
    });
  } catch (err) {
    console.error("Verify Payment Error:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function markPaymentFailed(req, res) {
  try {
    const { id } = req.params;
    const order = await orderModel.getOrderByIdForUser(id, req.user.id);
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (order.status !== "pending") {
      return res.status(400).json({ error: "This order can no longer be marked as failed." });
    }

    const updated = await orderModel.updateOrderStatus(id, "failed");
    res.json({ message: "Order marked as failed.", order: updated });
  } catch (err) {
    console.error("Mark Payment Failed Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await orderModel.getOrdersByUserId(req.user.id);
    res.json({ orders });
  } catch (err) {
    console.error("Get My Orders Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function getAllOrdersAdmin(req, res) {
  try {
    const orders = await orderModel.getAllOrdersForAdmin();
    res.json({ orders });
  } catch (err) {
    console.error("Get All Orders Admin Error:", err);
    res.status(500).json({ error: err.message });
  }
}

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
    console.error("Update Status Error:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  checkout,
  getMyOrders,
  getAllOrdersAdmin,
  updateStatus,
  verifyPayment,
  markPaymentFailed,
};