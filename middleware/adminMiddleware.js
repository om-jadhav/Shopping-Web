// middleware/adminMiddleware.js
const profileModel = require("../models/profileModel");

async function requireAdmin(req, res, next) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  } catch (err) {
    console.error("requireAdmin error:", err); // <-- temporary debug line
    return res.status(500).json({ error: "Could not verify admin access." });
  }
}

module.exports = { requireAdmin };