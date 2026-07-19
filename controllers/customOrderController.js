// controllers/customOrderController.js
const sharp = require("sharp");
const customOrderModel = require("../models/customOrderModel");
const materialModel = require("../models/materialModel");
const profileModel = require("../models/profileModel");
const { supabaseAdmin } = require("../config/supabaseClient");

const BUCKET = "custom-order-designs";
const VALID_PLACEMENTS = ["center", "left", "right"];
const VALID_GENDERS = ["male", "female", "unisex"];
const VALID_SIZES = ["S", "M", "L"];
const REQUIRED_PROFILE_FIELDS = ["full_name", "phone", "address_line1", "city", "state", "postal_code", "country"];

// Uploads one file as TWO variants:
//  - a scaled-down "thumb" (shown to the customer, keeps storage light)
//  - the ORIGINAL file, byte-for-byte untouched (only ever returned to
//    admin) - so "download" always gives back exactly what the customer
//    uploaded, at their original resolution and quality, no re-compression.
// Returns { thumbUrl, hqUrl }.
async function uploadPair(file, userId, label) {
  if (!file) return { thumbUrl: null, hqUrl: null };

  const base = `${userId}-${Date.now()}-${label}-${Math.random().toString(36).slice(2, 7)}`;
  const ext = file.mimetype === "image/jpeg" ? "jpg" : "png";

  const thumbBuffer = await sharp(file.buffer)
    .resize({ width: 500, withoutEnlargement: true })
    .png({ quality: 70 })
    .toBuffer();

  const thumbPath = `custom-orders/${base}-thumb.png`;
  const hqPath = `custom-orders/${base}-original.${ext}`;

  const [thumbUpload, hqUpload] = await Promise.all([
    supabaseAdmin.storage.from(BUCKET).upload(thumbPath, thumbBuffer, { contentType: "image/png", upsert: false }),
    supabaseAdmin.storage.from(BUCKET).upload(hqPath, file.buffer, { contentType: file.mimetype, upsert: false }),
  ]);

  if (thumbUpload.error) throw new Error(`Upload failed (${label} thumb): ${thumbUpload.error.message}`);
  if (hqUpload.error) throw new Error(`Upload failed (${label} original): ${hqUpload.error.message}`);

  const thumbUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
  const hqUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(hqPath).data.publicUrl;

  return { thumbUrl, hqUrl };
}

// POST /api/custom-orders (customer only)
async function createCustomOrder(req, res) {
  try {
    const userId = req.user.id;

    // Custom orders rely entirely on the profile for shipping info - there's
    // no separate address field on this form. Block here, before any upload
    // or stock decrement work happens, if the profile isn't filled in.
    const profile = await profileModel.getProfileById(userId).catch(() => null);
    const missingFields = REQUIRED_PROFILE_FIELDS.filter(
      (field) => !profile || !String(profile[field] || "").trim()
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Please complete your name, phone, and address under My Account before placing a custom order.",
        missingProfileFields: missingFields,
      });
    }

    const { color, materialId, placement, backPlacement, description } = req.body;

    if (!color) return res.status(400).json({ error: "Color is required." });
    if (!materialId) return res.status(400).json({ error: "Material is required." });
    if (!placement || !VALID_PLACEMENTS.includes(placement)) {
      return res.status(400).json({ error: "Valid front print placement is required." });
    }
    if (backPlacement && !VALID_PLACEMENTS.includes(backPlacement)) {
      return res.status(400).json({ error: "Invalid back print placement." });
    }

    let breakdown;
    try {
      breakdown = JSON.parse(req.body.sizeBreakdown || "[]");
    } catch (e) {
      return res.status(400).json({ error: "Invalid size breakdown format." });
    }

    if (!Array.isArray(breakdown) || breakdown.length === 0) {
      return res.status(400).json({ error: "At least one size/gender/quantity row is required." });
    }

    for (const row of breakdown) {
      if (!VALID_GENDERS.includes(row.gender) || !VALID_SIZES.includes(row.size) ||
          !Number.isInteger(row.quantity) || row.quantity <= 0) {
        return res.status(400).json({ error: "Invalid entry in size breakdown." });
      }
    }

    const files = req.files || {};
    const frontDesignFile = files.frontDesign?.[0] || null;
    const backDesignFile = files.backDesign?.[0] || null;
    const frontPreviewFile = files.frontPreview?.[0] || null;
    const backPreviewFile = files.backPreview?.[0] || null;

    if (!frontDesignFile && !backDesignFile) {
      return res.status(400).json({ error: "Upload at least a front or back design." });
    }

    const totalQuantity = breakdown.reduce((sum, row) => sum + row.quantity, 0);

    // Reduce stock BEFORE inserting the order - if this fails, nothing else happens.
    await materialModel.decrementStock(materialId, totalQuantity);

    let frontDesign, backDesign, frontPreview, backPreview;
    try {
      [frontDesign, backDesign, frontPreview, backPreview] = await Promise.all([
        uploadPair(frontDesignFile, userId, "front-design"),
        uploadPair(backDesignFile, userId, "back-design"),
        uploadPair(frontPreviewFile, userId, "front-preview"),
        uploadPair(backPreviewFile, userId, "back-preview"),
      ]);
    } catch (uploadErr) {
      // Roll back the stock decrement since the order won't actually be created.
      await materialModel.decrementStock(materialId, -totalQuantity).catch(() => {});
      throw uploadErr;
    }

    const order = await customOrderModel.createCustomOrder({
      user_id: userId,
      color,
      material_id: materialId,
      placement,
      back_placement: backPlacement || "center",
      front_design_url: frontDesign.thumbUrl,
      back_design_url: backDesign.thumbUrl,
      front_preview_url: frontPreview.thumbUrl,
      back_preview_url: backPreview.thumbUrl,
      front_design_hq_url: frontDesign.hqUrl,
      back_design_hq_url: backDesign.hqUrl,
      front_preview_hq_url: frontPreview.hqUrl,
      back_preview_hq_url: backPreview.hqUrl,
      description: description || null,
      size_breakdown: breakdown,
      total_quantity: totalQuantity,
    });

    res.status(201).json({ message: "Custom order placed successfully.", order });
  } catch (err) {
    console.error("Error creating custom order:", err);
    res.status(400).json({ error: err.message });
  }
}

// GET /api/custom-orders/mine (customer only)
async function getMyOrders(req, res) {
  try {
    const orders = await customOrderModel.getOrdersForUser(req.user.id);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/custom-orders/admin/all (admin only)
async function getAllOrdersAdmin(req, res) {
  try {
    const orders = await customOrderModel.getAllOrdersForAdmin();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/custom-orders/:id/status (admin only)
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ["designing", "printing", "shirt_collecting", "shipping", "completed", "reactivated"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const order = await customOrderModel.updateOrderStatus(req.params.id, status);
    res.json({ message: "Order status updated.", order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createCustomOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateStatus,
};