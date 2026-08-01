// public/js/orders.js

// Status pipeline for Custom Orders
const CUSTOM_STATUS_STEPS = [
  { key: "designing", label: "Designing" },
  { key: "printing", label: "Printing" },
  { key: "shirt_collecting", label: "Collecting" },
  { key: "shipping", label: "Shipping" },
  { key: "completed", label: "Completed" },
];

// Status pipeline for Regular Store Orders
const REGULAR_STATUS_STEPS = [
  { key: "pending", label: "Order Placed" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
];

// ---- Utility Helpers ----
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function colorNameFromHex(hex) {
  if (!hex) return "—";
  return hex.toUpperCase(); // Fallback to Hex code display if no map is provided
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function placementLabel(order) {
  const front = order.placement ? `Front - ${capitalize(order.placement)}` : null;
  const back = order.back_placement ? `Back - ${capitalize(order.back_placement)}` : null;
  return [front, back].filter(Boolean).join(", ") || "—";
}

// ---- Stepper HTML Component ----
function statusStepperHtml(status, steps = CUSTOM_STATUS_STEPS) {
  if (status === "reactivated") {
    return `<div class="reactivated-note">This order was reopened for changes and is being reworked.</div>`;
  }

  if (status === "cancelled") {
    return `<div class="cancelled-note">This order was cancelled.</div>`;
  }

  if (status === "failed") {
    return `<div class="failed-note">This order's payment failed. Please contact support if you were charged.</div>`;
  }

  const currentIdx = steps.findIndex((s) => s.key === status);

  return `
    <div class="status-stepper">
      ${steps
        .map((s, idx) => {
          let cls = "";
          if (idx < currentIdx) cls = "done";
          else if (idx === currentIdx) cls = "current";
          return `<div class="status-step ${cls}"><div class="dot"></div>${s.label}</div>`;
        })
        .join("")}
    </div>
  `;
}

// ---- Render Custom Order Card ----
function customOrderCardHtml(order) {
  const thumbs = [order.front_preview_url, order.back_preview_url].filter(Boolean);
  const breakdown = (order.size_breakdown || [])
    .map((row) => `${row.quantity}&times; ${capitalize(row.gender)} ${row.size}`)
    .join(", ");

  const isCompleted = order.status === "completed";

  return `
    <div class="order-card">
      <div class="order-type-badge custom-badge">Custom Order</div>
      <div class="order-card-top">
        <div class="order-thumbs">
          ${thumbs.map((url) => `<img src="${url}" alt="Design preview" class="clickable-thumb" data-full="${url}" />`).join("")}
        </div>
        <div class="order-fields">
          <div class="order-field"><span class="field-label">Material:</span> ${escapeHtml(order.materials?.name || "—")}</div>
          <div class="order-field"><span class="field-label">Color:</span> ${escapeHtml(colorNameFromHex(order.color))}</div>
          <div class="order-field"><span class="field-label">Placement:</span> ${escapeHtml(placementLabel(order))}</div>
          <div class="order-field"><span class="field-label">Quantity:</span> ${breakdown || order.total_quantity} (${order.total_quantity} total)</div>
          ${order.description ? `<div class="order-field"><span class="field-label">Note:</span> ${escapeHtml(order.description)}</div>` : ""}
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatDate(order.created_at)}</div>
          ${isCompleted ? `<div class="order-field order-date"><span class="field-label">Completed:</span> ${formatDate(order.status_updated_at)}</div>` : ""}
          <a href="/bill.html?type=custom&id=${encodeURIComponent(order.id)}" class="download-bill-link">Download Bill</a>
        </div>
      </div>
      ${statusStepperHtml(order.status, CUSTOM_STATUS_STEPS)}
    </div>
  `;
}

// ---- Render Regular Shop Order Card ----
function regularOrderCardHtml(order) {
  const items = order.order_items || [];
  const isPaid = ["paid", "shipped", "delivered"].includes(order.status);

  const itemsHtml = items.map((item) => {
    const product = item.products || {};
    const imageUrl = Array.isArray(product.image_urls) ? product.image_urls[0] : (product.image_urls || "/images/placeholder.png");
    const variantInfo = item.product_variants ? ` (${item.product_variants.title || item.product_variants.size})` : "";

    return `
      <div class="regular-item-row">
        <img src="${imageUrl}" alt="${escapeHtml(product.name || 'Product')}" class="clickable-thumb" data-full="${imageUrl}" />
        <div>
          <strong>${escapeHtml(product.name || 'Standard Product')}${escapeHtml(variantInfo)}</strong>
          <div>Qty: ${item.quantity || 1}</div>
          <div>Price: ₹${item.price_at_purchase || 0}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="order-card">
      <div class="order-type-badge shop-badge">Standard Purchase</div>
      <div class="order-card-top">
        <div class="regular-order-items">
          ${itemsHtml.length ? itemsHtml : "<div>No item details available</div>"}
        </div>
        <div class="order-fields">
          <div class="order-field"><span class="field-label">Order ID:</span> #${escapeHtml(String(order.id).slice(0, 8))}</div>
          <div class="order-field"><span class="field-label">Total Amount:</span> ₹${order.total_amount || 0}</div>
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatDate(order.created_at)}</div>
          ${isPaid ? `<a href="/bill.html?type=regular&id=${encodeURIComponent(order.id)}" class="download-bill-link">Download Bill</a>` : ""}
        </div>
      </div>
      ${statusStepperHtml(order.status, REGULAR_STATUS_STEPS)}
    </div>
  `;
}

// ---- Lightbox Functions ----
function openLightbox(src) {
  if (!src) return;
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImg");
  if (modal && img) {
    img.src = src;
    modal.classList.add("open");
  }
}

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  if (modal) modal.classList.remove("open");
}

function wireLightbox(container) {
  if (!container) return;
  container.querySelectorAll(".clickable-thumb").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.dataset.full));
  });
}

function isRegularOrderSettled(status) {
  return ["delivered", "cancelled", "failed"].includes(status);
}

// ---- Main Order Loader ----
async function loadOrders() {
  const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const activeContainer = document.getElementById("activeOrdersList");
  const completedContainer = document.getElementById("completedOrdersList");

  if (!activeContainer || !completedContainer) return;

  try {
    const [customRes, regularRes] = await Promise.allSettled([
      apiGet("/custom-orders/mine", token),
      apiGet("/orders", token),
    ]);

    const customOrders = customRes.status === "fulfilled" && customRes.value?.orders ? customRes.value.orders : [];
    const regularOrders = regularRes.status === "fulfilled" && regularRes.value?.orders ? regularRes.value.orders : [];

    const formattedCustom = customOrders.map((o) => ({ ...o, _type: "custom" }));
    const formattedRegular = regularOrders.map((o) => ({ ...o, _type: "regular" }));

    const allOrders = [...formattedCustom, ...formattedRegular].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const active = allOrders.filter((o) => {
      if (o._type === "custom") return o.status !== "completed";
      return !isRegularOrderSettled(o.status);
    });

    const completed = allOrders.filter((o) => {
      if (o._type === "custom") return o.status === "completed";
      return isRegularOrderSettled(o.status);
    });

    activeContainer.innerHTML = active.length
      ? active.map((o) => (o._type === "custom" ? customOrderCardHtml(o) : regularOrderCardHtml(o))).join("")
      : `<p class="empty-state">No active orders right now. <a href="/products.html">Browse Shop</a> or <a href="/customize.html">Design Custom Shirt</a>.</p>`;

    completedContainer.innerHTML = completed.length
      ? completed.map((o) => (o._type === "custom" ? customOrderCardHtml(o) : regularOrderCardHtml(o))).join("")
      : `<p class="empty-state">No completed orders yet.</p>`;

    wireLightbox(activeContainer);
    wireLightbox(completedContainer);
  } catch (err) {
    activeContainer.innerHTML = `<p class="empty-state">Could not load orders: ${escapeHtml(err.message)}</p>`;
    completedContainer.innerHTML = "";
  }
}

// Safely attach Event Listeners once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("lightboxCloseBtn");
  const modal = document.getElementById("lightboxModal");

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "lightboxModal") closeLightbox();
    });
  }

  loadOrders();
});