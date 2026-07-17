// controllers/materialController.js
const materialModel = require("../models/materialModel");

// GET /api/materials (public - active only)
async function listMaterials(req, res) {
  try {
    const materials = await materialModel.getActiveMaterials();
    res.json({ materials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/materials/admin/all (admin only)
async function listMaterialsAdmin(req, res) {
  try {
    const materials = await materialModel.getAllMaterialsForAdmin();
    res.json({ materials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/materials (admin only)
async function createMaterial(req, res) {
  try {
    const { name, stockQuantity } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Material name is required." });
    }
    const material = await materialModel.createMaterial({ name, stockQuantity });
    res.status(201).json({ message: "Material created.", material });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PATCH /api/materials/:id (admin only) - name, stock, active status
async function updateMaterial(req, res) {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.stockQuantity !== undefined) updates.stock_quantity = req.body.stockQuantity;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

    const material = await materialModel.updateMaterial(req.params.id, updates);
    res.json({ message: "Material updated.", material });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/materials/:id (admin only)
async function deleteMaterial(req, res) {
  try {
    await materialModel.deleteMaterial(req.params.id);
    res.json({ message: "Material deleted." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  listMaterials,
  listMaterialsAdmin,
  createMaterial,
  updateMaterial,
  deleteMaterial,
};