// models/orderModel.js
const { supabaseAdmin } = require("../config/supabaseClient");

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
      order_items (
        id, product_id, variant_id, quantity, price_at_purchase,
        products ( name, image_urls )
      )
    `)
    .eq("user_id", userId)
    .neq("status", "pending")
    .neq("status", "failed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
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

function buildShippingAddress(profile) {
  if (!profile) return "—";

  const parts = [
    profile.address_line1,
    profile.address_line2,
    profile.city,
    profile.state,
    profile.postal_code,
    profile.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "—";
}

function normalizeProfile(profile) {
  if (!profile) {
    return {
      full_name: "Unknown",
      phone: "No phone",
      shipping_address: "—",
      shipping_address_text: "—",
      address: "—",
    };
  }

  const shippingAddress = buildShippingAddress(profile);

  return {
    ...profile,
    full_name: profile.full_name || "Unknown",
    phone: profile.phone || "No phone",
    customer_name: profile.full_name || "Unknown",
    customer_phone: profile.phone || "No phone",
    shipping_address: shippingAddress,
    shipping_address_text: shippingAddress,
    address: shippingAddress,
  };
}

async function getAllOrdersForAdmin() {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      user_id,
      total_amount,
      status,
      created_at,
      order_items (
        id,
        product_id,
        variant_id,
        quantity,
        price_at_purchase,
        products ( name, image_urls )
      )
    `)
    .neq("status", "pending")
    .neq("status", "failed")
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];

  let profilesMap = {};

  if (userIds.length > 0) {
    const { data: profilesById } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, address_line1, address_line2, city, state, postal_code, country")
      .in("id", userIds);

    for (const profile of profilesById || []) {
      const key = profile.id;
      if (!key) continue;

      if (!profilesMap[key]) {
        profilesMap[key] = profile;
      }
    }
  }

  return (orders || []).map((order) => {
    const profile = profilesMap[order.user_id];
    const customer = normalizeProfile(profile);

    return {
      ...order,
      customer,
      customer_name: customer.full_name,
      customer_phone: customer.phone,
      shipping_address: customer.shipping_address,
      shipping_address_text: customer.shipping_address,
      address: customer.shipping_address,
    };
  });
}

async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add these functions to models/orderModel.js

async function attachRazorpayOrderId(orderId, razorpayOrderId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ razorpay_order_id: razorpayOrderId })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getOrderByIdForUser(orderId, userId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createPendingOrder(userId, razorpayOrderId = null) {
  const { data: cartItems, error: cartErr } = await supabaseAdmin
    .from("cart_items")
    .select(`
      product_id,
      variant_id,
      quantity,
      products(id, price, is_active),
      product_variants(id, stock_quantity)
    `)
    .eq("user_id", userId);

  if (cartErr) throw cartErr;
  if (!cartItems || cartItems.length === 0) throw new Error("CART_EMPTY");

  let total = 0;

  for (const ci of cartItems) {
    const p = ci.products || {};
    const pv = ci.product_variants || {};
    const unitPrice = p.price ?? 0;

    if (p.is_active === false) {
      throw new Error(`PRODUCT_UNAVAILABLE:${ci.product_id}`);
    }

    if (ci.variant_id) {
      const available = typeof pv.stock_quantity === "number" ? pv.stock_quantity : 0;
      if (available < ci.quantity) {
        throw new Error(`INSUFFICIENT_VARIANT_STOCK:${ci.variant_id}`);
      }
    }

    total += unitPrice * ci.quantity;
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: total,
      status: "pending",
      razorpay_order_id: razorpayOrderId,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;
  return order;
}

async function finalizeOrderAfterPayment(orderId, userId, paymentId) {
  const { data: cartItems, error: cartErr } = await supabaseAdmin
    .from("cart_items")
    .select(`
      product_id,
      variant_id,
      quantity,
      products(id, price)
    `)
    .eq("user_id", userId);

  if (cartErr) throw cartErr;
  if (!cartItems || cartItems.length === 0) throw new Error("CART_EMPTY");

  const orderItems = cartItems.map((ci) => ({
    order_id: orderId,
    product_id: ci.product_id,
    variant_id: ci.variant_id,
    quantity: ci.quantity,
    price_at_purchase: ci.products?.price ?? 0,
  }));

  const { error: itemsErr } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems);

  if (itemsErr) throw itemsErr;

  // Payment is already verified by this point (verifyPayment checked the
  // Razorpay signature before calling this function), so the customer has
  // definitely been charged. That means we must NOT throw out of this loop
  // and abandon the order - if a decrement fails partway we log it for the
  // admin to fix by hand instead, and still finish placing the order.
  const decremented = [];
  for (const ci of cartItems) {
    if (!ci.variant_id) continue; // no variant on this line item, nothing to decrement
    try {
      await decrementVariantStock(ci.variant_id, ci.quantity);
      decremented.push({ variantId: ci.variant_id, qty: ci.quantity });
    } catch (stockErr) {
      console.error(
        `[STOCK] Failed to decrement variant ${ci.variant_id} by ${ci.quantity} for order ${orderId}:`,
        stockErr.message
      );
      // Best-effort rollback of whatever we already decremented in this
      // same checkout, so one failing item doesn't leave the others wrong.
      for (const done of decremented) {
        await decrementVariantStock(done.variantId, -done.qty).catch(() => {});
      }
      break;
    }
  }

  const { data: order, error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      razorpay_payment_id: paymentId,
    })
    .eq("id", orderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  const { error: clearErr } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (clearErr) throw clearErr;

  return order;
}

// Atomically reduces a variant's stock by qty (pass a negative qty to add
// stock back, e.g. for rollback). Mirrors materialModel.decrementStock -
// the actual decrement happens inside a Postgres function so a stock check
// and the write can't race with another checkout happening at the same time.
async function decrementVariantStock(variantId, qty) {
  const { error } = await supabaseAdmin.rpc("decrement_variant_stock", {
    p_variant_id: variantId,
    p_qty: qty,
  });

  if (error) {
    if (error.message && error.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("Not enough stock left for this item.");
    }
    throw error;
  }
}

async function markOrderFailed(orderId, userId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function markOrderPaid(orderId, userId, paymentId) {
  const { data, error } = await supabaseAdmin.rpc("confirm_order_payment", {
    p_order_id: orderId,
    p_user_id: userId,
    p_payment_id: paymentId,
  });
  if (error) throw parseCheckoutError(error);
  return data;
}
module.exports = {
  createPendingOrder,
  getOrdersByUserId,
  hasUserPurchasedProduct,
  getAllOrdersForAdmin,
  updateOrderStatus,
  attachRazorpayOrderId,
  getOrderByIdForUser,
  decrementVariantStock,
  finalizeOrderAfterPayment,
  markOrderFailed,
};