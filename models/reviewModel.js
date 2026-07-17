// models/reviewModel.js
const { supabaseAdmin } = require("../config/supabaseClient");
const orderModel = require("./orderModel");

async function getReviewsForProduct(productId) {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function getReviewSummary(productId) {
  const reviews = await getReviewsForProduct(productId);
  const count = reviews.length;
  const average = count > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0;
  return { average, count };
}

async function getUserReviewForProduct(userId, productId) {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createReview(userId, productId, rating, comment) {
  const purchased = await orderModel.hasUserPurchasedProduct(userId, productId);
  if (!purchased) {
    const err = new Error("You can only review products you've purchased.");
    err.statusCode = 403;
    throw err;
  }

  const existing = await getUserReviewForProduct(userId, productId);
  if (existing) {
    const err = new Error("You've already reviewed this product.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .insert({ user_id: userId, product_id: productId, rating, comment: comment || null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { getReviewsForProduct, getReviewSummary, getUserReviewForProduct, createReview };