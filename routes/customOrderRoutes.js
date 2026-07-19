// routes/customOrderRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const customOrderController = require("../controllers/customOrderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only PNG or JPEG images are allowed."));
    }
  },
});

const uploadFields = upload.fields([
  { name: "frontDesign", maxCount: 1 },
  { name: "backDesign", maxCount: 1 },
  { name: "frontPreview", maxCount: 1 },
  { name: "backPreview", maxCount: 1 },
]);

// Customer
router.post("/", requireAuth, uploadFields, customOrderController.createCustomOrder);
router.get("/mine", requireAuth, customOrderController.getMyOrders);

// Admin
router.get("/admin/all", requireAuth, requireAdmin, customOrderController.getAllOrdersAdmin);
router.patch("/:id/status", requireAuth, requireAdmin, customOrderController.updateStatus);

module.exports = router;