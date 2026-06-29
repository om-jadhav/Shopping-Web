// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer"); 

const productController = require("../controllers/productController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

// 2. Configure multer to hold file streams temporarily in memory (RAM)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // UPDATED: Raised limit to 15MB per image so high-res phone cameras pass cleanly
    fileSize: 15 * 1024 * 1024, 
  },
});

// Public - anyone can browse
router.get("/", productController.listProducts);

// Admin only - list everything, including inactive products
router.get("/admin/all", requireAuth, requireAdmin, productController.listProductsAdmin);

router.get("/:id", productController.getProduct);

// 3. Inject upload.array("images", 10) here. 
router.post("/", requireAuth, requireAdmin, upload.array("images", 10), productController.createProduct);
router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  productController.updateProductStatus
);
router.put("/:id", requireAuth, requireAdmin, upload.array("images", 10), productController.updateProduct);router.delete("/:id", requireAuth, requireAdmin, productController.deleteProduct);

module.exports = router;