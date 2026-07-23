// models/customOrderModel.js
const { supabaseAdmin } = require("../config/supabaseClient");

async function createCustomOrder(orderData) {
  const { data, error } = await supabaseAdmin
    .from("custom_orders")
    .insert(orderData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Customer's own orders, newest first. Deliberately selects only the
// thumbnail columns - HQ URLs are never sent to a customer-facing request.
async function getOrdersForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("custom_orders")
    .select(`
      id, color, placement, back_placement, description, size_breakdown, total_quantity,
      status, status_updated_at, created_at,
      front_design_url, back_design_url, front_preview_url, back_preview_url,
      materials(name)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Admin - every order, with customer profile info & terms metadata joined in
async function getAllOrdersForAdmin() {
  const { data, error } = await supabaseAdmin
    .from("custom_orders")
    .select(`
      *,
      materials(name),
      profiles:user_id(full_name, phone, address_line1, address_line2, city, state, postal_code, country)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from("custom_orders")
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createCustomOrder,
  getOrdersForUser,
  getAllOrdersForAdmin,
  updateOrderStatus,
};