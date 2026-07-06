const { supabaseAdmin } = require("../config/supabaseClient");

async function validateProductAvailability(productIds, currentOfferId = null) {
  if (!productIds || productIds.length === 0) return;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, offer_id")
    .in("id", productIds);

  if (error) throw error;

  const conflicts = products.filter(
    (p) => p.offer_id !== null && p.offer_id.toString() !== (currentOfferId?.toString() || "")
  );

  if (conflicts.length > 0) throw new Error("Some products are already linked to another active offer.");
}

async function createOffer(req, res) {
  try {
    const { name, percentage, startDate, endDate, productIds } = req.body;
    await validateProductAvailability(productIds);

    const { data: offer, error } = await supabaseAdmin
      .from("offers")
      .insert([{ name, percentage, start_date: startDate, end_date: endDate, product_ids: productIds }])
      .select().single();

    if (error) throw error;

    await supabaseAdmin.from("products").update({ offer_id: offer.id }).in("id", productIds);
    res.status(201).json({ message: "Offer created", offer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getOffers(req, res) {
  try {
    const { data: offers, error } = await supabaseAdmin.from("offers").select("*");
    if (error) throw error;

    // TODO: Ideally, setup a Foreign Key join in Supabase so you don't need this loop!
    const enhanced = await Promise.all(offers.map(async (o) => {
      const { data: products } = await supabaseAdmin.from("products").select("id, name, image_url").eq("offer_id", o.id);
      return { ...o, productsList: products || [] };
    }));
    res.json({ offers: enhanced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateOffer(req, res) {
  try {
    const { id } = req.params;
    const { name, percentage, startDate, endDate, productIds } = req.body;
    
    await validateProductAvailability(productIds, id);

    // Parallel execution for faster updates
    await Promise.all([
      supabaseAdmin.from("products").update({ offer_id: null }).eq("offer_id", id),
      supabaseAdmin.from("offers").update({ name, percentage, start_date: startDate, end_date: endDate, product_ids: productIds }).eq("id", id)
    ]);
    
    await supabaseAdmin.from("products").update({ offer_id: id }).in("id", productIds);
    res.json({ message: "Offer updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function deleteOffer(req, res) {
  try {
    const { id } = req.params;
    await supabaseAdmin.from("products").update({ offer_id: null }).eq("offer_id", id);
    await supabaseAdmin.from("offers").delete().eq("id", id);
    res.json({ message: "Offer deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function cleanupExpiredOffers() {
  const { data: expired } = await supabaseAdmin.from("offers").select("id").lt("end_date", new Date().toISOString());
  if (!expired?.length) return;

  const ids = expired.map(o => o.id);
  await supabaseAdmin.from("products").update({ offer_id: null }).in("offer_id", ids);
  await supabaseAdmin.from("offers").delete().in("id", ids);
}

async function removeProductFromOffer(req, res) {
  try {
    const { id, productId } = req.params;
    const { data: offer } = await supabaseAdmin.from("offers").select("product_ids").eq("id", id).single();
    
    const updatedIds = (offer.product_ids || []).filter(pId => pId.toString() !== productId);
    
    await Promise.all([
      supabaseAdmin.from("products").update({ offer_id: null }).eq("id", productId),
      supabaseAdmin.from("offers").update({ product_ids: updatedIds }).eq("id", id)
    ]);
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createOffer, getOffers, updateOffer, deleteOffer, cleanupExpiredOffers, removeProductFromOffer };