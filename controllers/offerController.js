// controllers/offerController.js
const { supabase } = require("../config/supabaseClient");

// Helper function to sanitize product objects and guard image fallbacks at the database level
function sanitizeProductImage(product) {
  const fallback = "https://via.placeholder.com/150";
  if (!product) return { image_url: fallback };

  // Prioritize checking fields
  const candidates = [product.image_url, product.image_urls, product.images];

  for (const item of candidates) {
    if (!item) continue;

    // Check for a non-empty string that isn't corrupted to a simple string length index like "150"
    if (typeof item === "string" && item.trim() !== "" && item.trim() !== "150") {
      product.image_url = item.trim();
      return product;
    }
    // Check for array candidates containing a valid item string
    if (Array.isArray(item) && item.length > 0 && typeof item[0] === "string" && item[0].trim() !== "") {
      product.image_url = item[0].trim();
      return product;
    }
  }

  product.image_url = fallback;
  return product;
}

// Helper: remove offers whose end_date has passed, restore products
async function cleanupExpiredOffers() {
  try {
    const nowIso = new Date().toISOString();
    const { data: expiredOffers, error: fetchErr } = await supabase
      .from("offers")
      .select("*")
      .not("end_date", "is", null)
      .lt("end_date", nowIso);

    if (fetchErr) {
      console.error("cleanupExpiredOffers fetch error:", fetchErr.message);
      return;
    }

    if (!expiredOffers || expiredOffers.length === 0) return;

    for (const offer of expiredOffers) {
      const rawIds = Array.isArray(offer.product_ids) ? offer.product_ids : [];
      const numericalIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id));

      if (numericalIds.length > 0) {
        const { error: clearErr } = await supabase
          .from("products")
          .update({
            offer_name: null,
            offer_percentage: null,
            offer_start: null,
            offer_end: null
          })
          .in("id", numericalIds);

        if (clearErr) {
          console.error("cleanupExpiredOffers: failed to clear product promos:", clearErr.message);
        }
      }

      const { error: deleteErr } = await supabase
        .from("offers")
        .delete()
        .eq("id", offer.id);

      if (deleteErr) {
        console.error("cleanupExpiredOffers: failed to delete offer row:", deleteErr.message);
      } else {
        console.log(`cleanupExpiredOffers: removed expired offer id=${offer.id}`);
      }
    }
  } catch (err) {
    console.error("cleanupExpiredOffers unexpected error:", err);
  }
}

// 1. CREATE AN OFFER CAMPAIGN & CASCADE TO PRODUCTS (WITH GATEKEEPER CHECK)
async function createOffer(req, res) {
  try {
    const { name, percentage, startDate, endDate, productIds } = req.body;

    if (!name || !percentage || !productIds || productIds.length === 0) {
      return res.status(400).json({ error: "Missing required offer fields or target products." });
    }

    // 🌟 Fix: Parse incoming IDs to numbers to match PostgreSQL integer expectations
    const cleanProductIds = productIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (cleanProductIds.length === 0) {
      return res.status(400).json({ error: "No valid product IDs provided." });
    }

    // 🛡️ GATEKEEPER RULE: Check if any of these products are already in an active campaign
    const { data: conflictingProducts, error: checkError } = await supabase
      .from("products")
      .select("id, name, offer_percentage")
      .in("id", cleanProductIds)
      .not("offer_percentage", "is", null);

    if (checkError) {
      return res.status(400).json({ error: "Database pre-check failed: " + checkError.message });
    }

    if (conflictingProducts && conflictingProducts.length > 0) {
      const busyNames = conflictingProducts.map(p => `"${p.name}"`).join(", ");
      return res.status(400).json({
        error: `Cannot apply offer. The following items already have an active discount: ${busyNames}. Please end their existing campaign first.`
      });
    }

    // A) Log the master campaign into the offers tracker table
    const { data: newOffer, error: offerError } = await supabase
      .from("offers")
      .insert([{
        name,
        percentage: parseInt(percentage),
        start_date: startDate || null,
        end_date: endDate || null,
        product_ids: cleanProductIds // Stored uniformly as numbers
      }])
      .select()
      .single();

    if (offerError) {
      return res.status(400).json({ error: offerError.message });
    }

    // B) Push discount values directly down to the chosen product rows
    const { error: productError } = await supabase
      .from("products")
      .update({
        offer_name: name,
        offer_percentage: parseInt(percentage),
        offer_start: startDate || null,
        offer_end: endDate || null
      })
      .in("id", cleanProductIds);

    if (productError) {
      return res.status(400).json({ error: productError.message });
    }

    return res.status(200).json({
      message: "Offer campaign applied successfully!",
      data: newOffer
    });

  } catch (err) {
    console.error("Error applying product offer:", err);
    return res.status(500).json({ error: err.message });
  }
}

// 2. FETCH ALL ACTIVE CAMPAIGNS STITCHED WITH PRODUCT DETAILS
async function getOffers(req, res) {
  try {
    // Ensure expired campaigns are removed before returning active campaigns
    await cleanupExpiredOffers();

    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("🚨 Supabase Query Error in getOffers:", error);
      return res.status(200).json({ offers: [], message: "Table initializing..." });
    }

    // 🚀 Stitch metadata for item thumbnails
    const enhancedOffers = await Promise.all((offers || []).map(async (camp) => {
      const rawIds = Array.isArray(camp.product_ids) ? camp.product_ids : [];
      const numericalIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id));

      if (numericalIds.length === 0) {
        return { ...camp, productsList: [] };
      }

      // Quick look-up to gather metadata for linked item displays
      const stringIds = numericalIds.map(id => String(id));
      const lookupIds = [...new Set([...numericalIds, ...stringIds])];

      // 🌟 FIXED: Removed 'images' and 'image_urls' to prevent the 42703 Postgres column crash
      const { data: productsInfo, error: productQueryError } = await supabase
        .from("products")
        .select("id, name, image_url")
        .or(`id.in.(${lookupIds.join(',')})`);

      if (productQueryError) {
        console.error("🚨 Error stitching product metadata inside getOffers:", productQueryError.message);
      }

      // Clean individual product elements before leaving the server layer
      const sanitizedList = (productsInfo || []).map(prod => sanitizeProductImage(prod));

      return {
        ...camp,
        productsList: sanitizedList
      };
    }));

    return res.status(200).json({ offers: enhancedOffers });
  } catch (err) {
    console.error("🚨 System Crash Error in getOffers:", err);
    return res.status(500).json({ error: err.message, offers: [] });
  }
}

// 3. DELETE A CAMPAIGN & RESTORE ORIGINAL PRICES
async function deleteOffer(req, res) {
  try {
    const { id } = req.params;

    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !offer) {
      return res.status(404).json({ error: "Offer campaign not found or already deleted." });
    }

    const rawIds = Array.isArray(offer.product_ids) ? offer.product_ids : [];
    const numericalIds = rawIds.map(pId => parseInt(pId)).filter(pId => !isNaN(pId));

    if (numericalIds.length > 0) {
      const { error: clearError } = await supabase
        .from("products")
        .update({
          offer_name: null,
          offer_percentage: null,
          offer_start: null,
          offer_end: null
        })
        .in("id", numericalIds);

      if (clearError) {
        return res.status(400).json({ error: clearError.message });
      }
    }

    const { error: deleteError } = await supabase
      .from("offers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.status(200).json({ message: "Campaign ended and original product pricing restored successfully!" });
  } catch (err) {
    console.error("Error removing campaign:", err);
    return res.status(500).json({ error: err.message });
  }
}

// 🚀 4. REMOVE A SINGLE PRODUCT FROM AN ACTIVE OFFER CAMPAIGN
async function removeProductFromOffer(req, res) {
  try {
    const { id, productId } = req.params;
    const targetProductId = parseInt(productId);

    // A) Fetch the campaign to get its current product array
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !offer) {
      return res.status(404).json({ error: "Offer campaign not found." });
    }

    // B) Clean up arrays by filtering out using cross-type matching comparisons
    const currentProducts = Array.isArray(offer.product_ids) ? offer.product_ids : [];
    const updatedProducts = currentProducts
      .map(pId => parseInt(pId))
      .filter(pId => !isNaN(pId) && pId !== targetProductId);

    // C) Update the master tracking row with the updated array
    const { error: updateOfferError } = await supabase
      .from("offers")
      .update({ product_ids: updatedProducts })
      .eq("id", id);

    if (updateOfferError) {
      return res.status(400).json({ error: updateOfferError.message });
    }

    // D) Clear out the promotional properties from the isolated product row
    const { error: clearProductError } = await supabase
      .from("products")
      .update({
        offer_name: null,
        offer_percentage: null,
        offer_start: null,
        offer_end: null
      })
      .eq("id", targetProductId);

    if (clearProductError) {
      return res.status(400).json({ error: clearProductError.message });
    }

    return res.status(200).json({ message: "Product successfully removed from this campaign!" });
  } catch (err) {
    console.error("Error removing single product from campaign:", err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createOffer,
  getOffers,
  deleteOffer,
  removeProductFromOffer,
  cleanupExpiredOffers
};