// controllers/cartController.js
const cartModel = require("../models/cartModel");
const profileModel = require("../models/profileModel");

// GET /api/cart
async function getCart(req, res) {
  try {
    const items = await cartModel.getCartByUserId(req.user.id);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/cart  { product_id, variant_id, quantity }
async function addToCart(req, res) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    if (profile?.role === "admin") {
      return res.status(403).json({ error: "Admins cannot add items to a cart." });
    }

    const { product_id, variant_id, quantity } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: "product_id is required." });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const item = await cartModel.addOrIncrementItem(
      req.user.id,
      product_id,
      variant_id || null,
      qty
    );

    res.status(201).json({ message: "Added to cart.", item });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

// PATCH /api/cart/:id  { quantity }
async function updateCartItem(req, res) {
  try {
    const { quantity } = req.body;

    if (!Number(quantity) || Number(quantity) < 1) {
      return res.status(400).json({ error: "quantity must be at least 1." });
    }

    const item = await cartModel.updateItemQuantity(req.user.id, req.params.id, Number(quantity));
    res.json({ message: "Cart updated.", item });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

// DELETE /api/cart/:id
async function removeCartItem(req, res) {
  try {
    await cartModel.removeItem(req.user.id, req.params.id);
    res.json({ message: "Item removed." });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem };