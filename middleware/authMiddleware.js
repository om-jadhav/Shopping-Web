// middleware/authMiddleware.js
// Protects routes. Expects: Authorization: Bearer <access_token>
// The token is the one Supabase hands back after login/signup.

const { supabase, supabaseAdmin } = require("../config/supabaseClient");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }

  // Attach the user + raw token to the request so controllers can use them.
  req.user = data.user;
  req.token = token;
  next();
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    // Query profiles table to check user role
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error || profile?.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin rights required." });
    }

    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ error: "Failed to authorize admin user." });
  }
}

module.exports = { requireAuth, requireAdmin };