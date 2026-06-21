// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve the frontend (plain HTML/CSS/JS) from /public
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);

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
