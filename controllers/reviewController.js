// controllers/reviewController.js
const reviewModel = require("../models/reviewModel");

// GET /api/reviews/:productId
async function getReviews(req, res) {
  try {
    const [reviews, summary] = await Promise.all([
      reviewModel.getReviewsForProduct(req.params.productId),
      reviewModel.getReviewSummary(req.params.productId),
    ]);
    res.json({ reviews, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/reviews/:productId/me  (can current user review this product?)
async function getMyReviewStatus(req, res) {
  try {
    const [existing, purchased] = await Promise.all([
      reviewModel.getUserReviewForProduct(req.user.id, req.params.productId),
      require("../models/orderModel").hasUserPurchasedProduct(req.user.id, req.params.productId),
    ]);
    res.json({ hasReviewed: !!existing, canReview: purchased && !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/reviews/:productId  { rating, comment }
async function submitReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);

    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    const review = await reviewModel.createReview(req.user.id, req.params.productId, numRating, comment);
    res.status(201).json({ message: "Review submitted.", review });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

module.exports = { getReviews, getMyReviewStatus, submitReview };