// config/supabaseClient.js
// This file is the ONLY place that talks directly to Supabase's SDK setup.
// Everything else (models/controllers) imports from here.

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[supabaseClient] Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

// Public client - safe-ish key, respects Row Level Security (RLS).
// Use this for anything done "as the user" (signup, login).
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client - bypasses RLS, NEVER expose this key to the frontend.
// Use this only on the server for trusted operations (e.g. reading any profile).
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase, supabaseAdmin };
