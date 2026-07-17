// routes/materialRoutes.js
const express = require("express");
const router = express.Router();

const materialController = require("../controllers/materialController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

router.get("/", materialController.listMaterials);
router.get("/admin/all", requireAuth, requireAdmin, materialController.listMaterialsAdmin);
router.post("/", requireAuth, requireAdmin, materialController.createMaterial);
router.patch("/:id", requireAuth, requireAdmin, materialController.updateMaterial);
router.delete("/:id", requireAuth, requireAdmin, materialController.deleteMaterial);

module.exports = router;