// models/categoryModel.js
const { supabase } = require("../config/supabaseClient");

async function getAllCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

module.exports = { getAllCategories };
