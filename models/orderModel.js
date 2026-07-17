// models/orderModel.js
const { supabaseAdmin } = require("../config/supabaseClient");

async function checkoutCart(userId) {
  const { data, error } = await supabaseAdmin.rpc("checkout_cart", { p_user_id: userId });
  if (error) throw parseCheckoutError(error);
  return data;
}

function parseCheckoutError(error) {
  const msg = error.message || "";

  if (msg.includes("CART_EMPTY")) {
    const err = new Error("Your cart is empty.");
    err.statusCode = 400;
    return err;
  }
  if (msg.includes("INSUFFICIENT_STOCK")) {
    const err = new Error("One or more items in your cart don't have enough stock. Please review your cart.");
    err.statusCode = 400;
    return err;
  }
  if (msg.includes("PRODUCT_UNAVAILABLE")) {
    const err = new Error("One or more items in your cart are no longer available. Please remove them.");
    err.statusCode = 400;
    return err;
  }

  return error;
}

async function getOrdersByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      id, total_amount, status, created_at,
      order_items ( id, product_id, variant_id, quantity, price_at_purchase,
        products ( name, image_urls ) )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function hasUserPurchasedProduct(userId, productId) {
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("id, orders!inner(user_id, status)")
    .eq("product_id", productId)
    .eq("orders.user_id", userId)
    .eq("orders.status", "paid")
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

module.exports = { checkoutCart, getOrdersByUserId, hasUserPurchasedProduct };