// models/profileModel.js
// "Model" layer: every direct database query lives here, not in the controller.
// We keep an extra "profiles" table because Supabase's built-in auth.users
// table is locked down and only stores email/password — not things like
// full_name, address, etc. that a shopping site will need later.

const { supabaseAdmin } = require("../config/supabaseClient");

async function getProfileById(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function updateProfile(userId, updates) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { getProfileById, updateProfile };
