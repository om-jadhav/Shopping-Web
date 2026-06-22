// controllers/productController.js
const productModel = require("../models/productModel");

// GET /api/products?category=2&gender=men&search=shirt
async function listProducts(req, res) {
  try {
    const { category, gender, search } = req.query;
    const products = await productModel.getAllProducts({ category, gender, search });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// GET /api/products/admin/all (admin only - includes inactive products)
async function listProductsAdmin(req, res) {
  try {
    const products = await productModel.getAllProductsForAdmin();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// GET /api/products/:id
async function getProduct(req, res) {
  try {
    const product = await productModel.getProductById(req.params.id);
    res.json({ product });
  } catch (err) {
    res.status(404).json({ error: "Product not found." });
  }
}

// POST /api/products (admin only)
async function createProduct(req, res) {
  try {
    const { name, price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required." });
    }

    const product = await productModel.createProduct(req.body);
    res.status(201).json({ message: "Product created.", product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/products/:id (admin only)
async function updateProduct(req, res) {
  try {
    const body = req.body;
    const updates = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.price !== undefined) updates.price = body.price;
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.categoryId !== undefined) updates.category_id = body.categoryId;

    const product = await productModel.updateProduct(req.params.id, updates);
    res.json({ message: "Product updated.", product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/products/:id (admin only)
async function deleteProduct(req, res) {
  try {
    await productModel.deleteProduct(req.params.id);
    res.json({ message: "Product deleted." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { listProducts, listProductsAdmin, getProduct, createProduct, updateProduct, deleteProduct };