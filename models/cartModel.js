// models/cartModel.js
const { supabaseAdmin } = require("../config/supabaseClient");

async function getActiveOffersMap(productIds) {
  if (!productIds.length) return {};

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("*")
    .lte("start_date", nowIso)
    .or(`end_date.is.null,end_date.gte.${nowIso}`);

  if (error) throw error;

  const map = {};
  for (const offer of data) {
    const ids = offer.product_ids || [];
    for (const pid of ids) {
      if (!productIds.includes(pid)) continue;
      if (!map[pid] || offer.percentage > map[pid].percentage) {
        map[pid] = offer;
      }
    }
  }
  return map;
}

async function getCartByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from("cart_items")
    .select(`
      id,
      quantity,
      product_id,
      variant_id,
      products ( id, name, price, image_urls, is_active ),
      product_variants ( id, size, color, stock_quantity )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const productIds = [...new Set(data.map((item) => item.product_id))];
  const offersMap = await getActiveOffersMap(productIds);

  return data.map((item) => ({
    ...item,
    products: item.products
      ? { ...item.products, offer_percentage: offersMap[item.product_id]?.percentage || 0 }
      : item.products,
  }));
}

async function getVariantStock(variantId) {
  if (!variantId) return null;
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("stock_quantity")
    .eq("id", variantId)
    .single();

  if (error) throw error;
  return data.stock_quantity;
}

async function addOrIncrementItem(userId, productId, variantId, quantity) {
  const { data, error } = await supabaseAdmin.rpc("add_to_cart_atomic", {
    p_user_id: userId,
    p_product_id: productId,
    p_variant_id: variantId || null,
    p_quantity: quantity,
  });

  if (error) throw parseCartError(error);
  return data;
}

async function updateItemQuantity(userId, itemId, quantity) {
  const { data, error } = await supabaseAdmin.rpc("update_cart_quantity_atomic", {
    p_user_id: userId,
    p_item_id: itemId,
    p_quantity: quantity,
  });

  if (error) throw parseCartError(error);
  return data;
}

// Postgres RAISE EXCEPTION messages come back as error.message.
// We encode structured info in the message (e.g. "INSUFFICIENT_STOCK:2:1")
// so we can turn it into a clean, specific error for the frontend.
function parseCartError(error) {
  const msg = error.message || "";

  if (msg.includes("INSUFFICIENT_STOCK")) {
    const match = msg.match(/INSUFFICIENT_STOCK:(\d+):(\d+)/);
    const stock = match ? Number(match[1]) : 0;
    const alreadyInCart = match ? Number(match[2]) : 0;
    const err = new Error(
      stock === 0
        ? "This item is out of stock."
        : `Only ${stock} in stock.${alreadyInCart > 0 ? ` You already have ${alreadyInCart} in your cart.` : ""}`
    );
    err.statusCode = 400;
    return err;
  }

  if (msg.includes("VARIANT_NOT_FOUND")) {
    const err = new Error("This product variant no longer exists.");
    err.statusCode = 400;
    return err;
  }

  if (msg.includes("CART_ITEM_NOT_FOUND")) {
    const err = new Error("Cart item not found.");
    err.statusCode = 404;
    return err;
  }

  return error;
}

async function removeItem(userId, itemId) {
  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

async function clearCart(userId) {
  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

module.exports = {
  getCartByUserId,
  getVariantStock,
  addOrIncrementItem,
  updateItemQuantity,
  removeItem,
  clearCart,
};