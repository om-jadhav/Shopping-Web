const { supabaseAdmin } = require("../config/supabaseClient");

async function getPrices() {
  const { data, error } = await supabaseAdmin
    .from("printing_prices")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data;
}

async function updatePrices(singleSidePrice, doubleSidePrice) {
  const { data, error } = await supabaseAdmin
    .from("printing_prices")
    .update({
      single_side_price: singleSidePrice,
      double_side_price: doubleSidePrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getPrices,
  updatePrices,
};