// models/materialModel.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

// Public - only active materials (for the customer-facing dropdown)
async function getActiveMaterials() {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data;
}

// Admin - sees everything, including deactivated materials
async function getAllMaterialsForAdmin() {
  const { data, error } = await supabaseAdmin
    .from("materials")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

async function createMaterial({ name, stockQuantity }) {
  const { data, error } = await supabaseAdmin
    .from("materials")
    .insert({ name, stock_quantity: stockQuantity ?? 0 })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateMaterial(id, updates) {
  const { data, error } = await supabaseAdmin
    .from("materials")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteMaterial(id) {
  const { error } = await supabaseAdmin.from("materials").delete().eq("id", id);
  if (error) throw error;
}

// Atomically reduces stock by qty. Throws if there isn't enough stock left -
// callers should catch this and stop the order before inserting anything.
async function decrementStock(materialId, qty) {
  const { error } = await supabaseAdmin.rpc("decrement_material_stock", {
    p_material_id: materialId,
    p_qty: qty,
  });

  if (error) {
    if (error.message && error.message.includes("INSUFFICIENT_MATERIAL_STOCK")) {
      throw new Error("Not enough material in stock for this order.");
    }
    throw error;
  }
}

module.exports = {
  getActiveMaterials,
  getAllMaterialsForAdmin,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  decrementStock,
};