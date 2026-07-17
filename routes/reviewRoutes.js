const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/:productId", reviewController.getReviews); // public
router.get("/:productId/me", requireAuth, reviewController.getMyReviewStatus);
router.post("/:productId", requireAuth, reviewController.submitReview);

module.exports = router;