// public/js/api.js
// Tiny shared helpers used by login.js / signup.js / dashboard.js

const TOKEN_KEY = "sb_access_token";

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiPost(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function apiGet(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

// Maps the hex values used on the customize page (see COLORS in
// customize.js) to friendly names, so order displays never show a raw
// hex code. Keep this in sync if the color palette in customize.js changes.
const COLOR_NAME_MAP = {
  "#f2f2f2": "White",
  "#1c1c1c": "Black",
  "#1b2a4a": "Navy",
  "#b23b3b": "Red",
  "#8a8a8a": "Grey",
  "#2f4a34": "Forest Green",
  "#c9a227": "Mustard",
  "#5b8fb0": "Sky Blue",
  "#6b2632": "Maroon",
  "#333438": "Charcoal",
};

function colorNameFromHex(hex) {
  if (!hex) return "Unknown";
  return COLOR_NAME_MAP[hex.toLowerCase()] || hex;
}

// Forces a real file download (rather than opening in a new tab) even for
// cross-origin URLs like Supabase Storage links, by fetching the bytes
// ourselves and triggering a save via a temporary object URL.
async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert("Could not download file: " + err.message);
  }
}

// Small floating confirmation popup - styled inline so it works on any page
// without needing its own CSS file. type: "success" | "error".
function showToast(text, type = "success") {
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999;
    padding: 12px 18px;
    border-radius: 8px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.9rem;
    color: ${type === "error" ? "#ff6b6b" : "#6bdc9c"};
    background: ${type === "error" ? "rgba(255,107,107,0.15)" : "rgba(107,220,156,0.15)"};
    border: 1px solid ${type === "error" ? "rgba(255,107,107,0.35)" : "rgba(107,220,156,0.35)"};
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    opacity: 0;
    transition: opacity 0.2s ease;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = "1"; });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}