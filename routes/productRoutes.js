// routes/productRoutes.js
const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

// Public - anyone can browse
router.get("/", productController.listProducts);

// Admin only - list everything, including inactive products
router.get("/admin/all", requireAuth, requireAdmin, productController.listProductsAdmin);

router.get("/:id", productController.getProduct);

router.post("/", requireAuth, requireAdmin, productController.createProduct);
router.put("/:id", requireAuth, requireAdmin, productController.updateProduct);
router.delete("/:id", requireAuth, requireAdmin, productController.deleteProduct);

module.exports = router;