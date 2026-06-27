// controllers/productController.js
const productModel = require("../models/productModel");
const { supabaseAdmin } = require("../config/supabaseClient");
const sharp = require("sharp");

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

    let processedUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
        const filePath = `products/${fileName}`;

        const optimizedBuffer = await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from("product-images")
          .upload(filePath, optimizedBuffer, {
            contentType: "image/jpeg",
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Supabase Storage Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabaseAdmin
          .storage
          .from("product-images")
          .getPublicUrl(filePath);

        processedUrls.push(publicUrl);
      }
    }

    const productData = {
      name: req.body.name,
      description: req.body.description,
      brand: req.body.brand,
      gender: req.body.gender,
      categoryId: req.body.categoryId,
      price: req.body.price,
      imageUrls: processedUrls
    };

    if (typeof req.body.variants === 'string') {
      try {
        productData.variants = JSON.parse(req.body.variants);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format for variants." });
      }
    }

    const product = await productModel.createProduct(productData);
    res.status(201).json({ message: "Product created successfully.", product });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/products/:id (admin only)
async function updateProduct(req, res) {
  try {
    const body = req.body;
    const updates = {};
    let variantsArray = null;

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.price !== undefined) updates.price = body.price;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.categoryId !== undefined) updates.category_id = body.categoryId;

    if (typeof body.variants === 'string') {
      try {
        variantsArray = JSON.parse(body.variants);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format for variants." });
      }
    }

    // 1. Fetch the product's current database state BEFORE applying updates
    const currentProduct = await productModel.getProductById(req.params.id);
    const originalUrls = currentProduct?.image_urls || [];

    // Parse the remaining old images array sent from the client-side panel
    let currentUrls = [];
    if (body.existingImages !== undefined) {
      try {
        currentUrls = typeof body.existingImages === 'string'
          ? JSON.parse(body.existingImages)
          : body.existingImages;
      } catch (e) {
        currentUrls = [];
      }
    }

    // --- PROCESS BRAND NEW FILE ATTACHMENTS IF ANY ---
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
        const filePath = `products/${fileName}`;

        const optimizedBuffer = await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from("product-images")
          .upload(filePath, optimizedBuffer, {
            contentType: "image/jpeg",
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Supabase Storage Upload failed during edit: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabaseAdmin
          .storage
          .from("product-images")
          .getPublicUrl(filePath);

        currentUrls.push(publicUrl);
      }
    }

    // 🚀 2. STORAGE CLEANUP LOGIC: Find which images were explicitly removed by the user
    if (body.existingImages !== undefined) {
      const imagesToRemove = originalUrls.filter(url => !currentUrls.includes(url));

      if (imagesToRemove.length > 0) {
        // Convert the full public URLs back into relative Supabase storage paths (e.g., "products/filename.jpg")
        const pathsToDelete = imagesToRemove.map(url => {
          const parts = url.split("/product-images/");
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean);

        if (pathsToDelete.length > 0) {
          // Tell Supabase to permanently wipe these specific file paths from the bucket
          const { error: deleteError } = await supabaseAdmin
            .storage
            .from("product-images")
            .remove(pathsToDelete);

          if (deleteError) {
            console.error("Failed to delete orphaned images from Supabase Storage:", deleteError.message);
            // We log the error but don't stop the request so the user's text changes still save successfully!
          } else {
            console.log(`Successfully cleaned up ${pathsToDelete.length} unused image(s) from storage.`);
          }
        }
      }
    }

    if (body.existingImages !== undefined || (req.files && req.files.length > 0)) {
      updates.image_urls = currentUrls;
    }

    const product = await productModel.updateProduct(req.params.id, updates, variantsArray);

    res.json({ message: "Product updated successfully.", product });
  } catch (err) {
    console.error("Error updating product:", err);
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