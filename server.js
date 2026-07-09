// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const offerRoutes = require("./routes/offerRoutes");
const profileRoutes = require("./routes/profileRoutes");
const offerController = require("./controllers/offerController");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve the frontend (plain HTML/CSS/JS) from /public
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/profile", profileRoutes);

// Simple health check - good way to confirm the server + env vars are alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// run initial cleanup and schedule periodic cleanup of expired offers
const CLEANUP_INTERVAL_MS = Number(process.env.OFFER_CLEANUP_INTERVAL_MS) || 60_000;
(async () => {
  try {
    await offerController.cleanupExpiredOffers();
  } catch (err) {
    console.error("Initial expired-offers cleanup failed:", err);
  }
  setInterval(() => {
    offerController.cleanupExpiredOffers().catch(err => {
      console.error("Scheduled expired-offers cleanup failed:", err);
    });
  }, CLEANUP_INTERVAL_MS);
})();