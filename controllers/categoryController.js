// controllers/categoryController.js
const categoryModel = require("../models/categoryModel");

async function listCategories(req, res) {
  try {
    const categories = await categoryModel.getAllCategories();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listCategories };