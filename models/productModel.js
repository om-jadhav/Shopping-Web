// models/productModel.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

// ---- Public reads (anon client, respects RLS -> only active products) ----

async function getAllProducts({ category, gender, search } = {}) {
  let query = supabase
    .from("products")
    .select("*, category:categories(id, name, slug), product_variants(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category_id", category);
  if (gender) query = query.eq("gender", gender);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, name, slug), product_variants(*)")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) throw error;
  return data;
}

// ---- Admin writes (service role client, bypasses RLS) ----

async function createProduct({ name, description, brand, gender, categoryId, price, imageUrl, variants }) {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .insert({
      name,
      description,
      brand,
      gender,
      category_id: categoryId || null,
      price,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw error;

  if (Array.isArray(variants) && variants.length > 0) {
    const rows = variants.map((v) => ({
      product_id: product.id,
      size: v.size || null,
      color: v.color || null,
      sku: v.sku || null,
      stock_quantity: v.stockQuantity ?? 0,
    }));

    const { error: variantError } = await supabaseAdmin
      .from("product_variants")
      .insert(rows);

    if (variantError) throw variantError;
  }

  return product;
}

async function updateProduct(id, updates) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) throw error;
}
// Admin view - sees EVERYTHING, including deactivated products.
// Uses supabaseAdmin since the anon client's RLS policy only allows
// is_active = true rows.
async function getAllProductsForAdmin() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, category:categories(id, name, slug), product_variants(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = {
  getAllProducts,
  getAllProductsForAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};