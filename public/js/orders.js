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

function statusStepperHtml(status, steps = CUSTOM_STATUS_STEPS) {
  if (status === "reactivated") {
    return `<div class="reactivated-note">This order was reopened for changes and is being reworked.</div>`;
  }

  const currentIdx = steps.findIndex((s) => s.key === status);

  return `
    <div class="status-stepper">
      ${steps.map((s, idx) => {
        let cls = "";
        if (idx < currentIdx) cls = "done";
        else if (idx === currentIdx) cls = "current";
        return `<div class="status-step ${cls}"><div class="dot"></div>${s.label}</div>`;
      }).join("")}
    </div>
  `;
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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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
          <div class="order-field"><span class="field-label">Material:</span> ${order.materials?.name || "—"}</div>
          <div class="order-field"><span class="field-label">Color:</span> ${colorNameFromHex(order.color)}</div>
          <div class="order-field"><span class="field-label">Placement:</span> ${placementLabel(order)}</div>
          <div class="order-field"><span class="field-label">Quantity:</span> ${breakdown} (${order.total_quantity} total)</div>
          ${order.description ? `<div class="order-field"><span class="field-label">Note:</span> ${order.description}</div>` : ""}
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatDate(order.created_at)}</div>
          ${isCompleted ? `<div class="order-field order-date"><span class="field-label">Completed:</span> ${formatDate(order.status_updated_at)}</div>` : ""}
        </div>
      </div>
      ${statusStepperHtml(order.status, CUSTOM_STATUS_STEPS)}
    </div>
  `;
}

// ---- Render Regular Shop Order Card (Synced with orderModel.js structure) ----
function regularOrderCardHtml(order) {
  const items = order.order_items || [];
  const isCompleted = order.status === "completed" || order.status === "delivered";

  const itemsHtml = items.map(item => {
    const product = item.products || {};
    // image_urls can be an array in Supabase
    const imageUrl = Array.isArray(product.image_urls) ? product.image_urls[0] : (product.image_urls || '/images/placeholder.png');

    return `
      <div class="regular-item-row">
        <img src="${imageUrl}" alt="${product.name || 'Product'}" class="clickable-thumb" data-full="${imageUrl}" />
        <div>
          <strong>${product.name || 'Standard Product'}</strong>
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
          ${itemsHtml.length ? itemsHtml : '<div>No item details available</div>'}
        </div>
        <div class="order-fields">
          <div class="order-field"><span class="field-label">Order ID:</span> #${String(order.id).slice(0, 8)}</div>
          <div class="order-field"><span class="field-label">Total Amount:</span> ₹${order.total_amount || 0}</div>
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatDate(order.created_at)}</div>
        </div>
      </div>
      ${statusStepperHtml(order.status, REGULAR_STATUS_STEPS)}
    </div>
  `;
}

// ---- Lightbox for enlarging thumbnails ----
function openLightbox(src) {
  if (!src) return;
  const modal = document.getElementById("lightboxModal");
  document.getElementById("lightboxImg").src = src;
  modal.classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightboxModal").classList.remove("open");
}

function wireLightbox(container) {
  container.querySelectorAll(".clickable-thumb").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.dataset.full));
  });
}

// ---- Main Order Loader ----
async function loadOrders() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const activeContainer = document.getElementById("activeOrdersList");
  const completedContainer = document.getElementById("completedOrdersList");

  try {
    // Fetch custom orders AND regular store orders (/api/orders as defined in orderController.js)
    const [customRes, regularRes] = await Promise.allSettled([
      apiGet("/custom-orders/mine", token),
      apiGet("/orders", token)
    ]);

    const customOrders = (customRes.status === "fulfilled" && customRes.value?.orders) ? customRes.value.orders : [];
    const regularOrders = (regularRes.status === "fulfilled" && regularRes.value?.orders) ? regularRes.value.orders : [];

    const formattedCustom = customOrders.map(o => ({ ...o, _type: 'custom' }));
    const formattedRegular = regularOrders.map(o => ({ ...o, _type: 'regular' }));

    const allOrders = [...formattedCustom, ...formattedRegular].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const active = allOrders.filter((o) => o.status !== "completed" && o.status !== "delivered");
    const completed = allOrders.filter((o) => o.status === "completed" || o.status === "delivered");

    activeContainer.innerHTML = active.length
      ? active.map(o => o._type === 'custom' ? customOrderCardHtml(o) : regularOrderCardHtml(o)).join("")
      : `<p class="empty-state">No active orders right now. <a href="/products.html">Browse Shop</a> or <a href="/customize.html">Design Custom Shirt</a>.</p>`;

    completedContainer.innerHTML = completed.length
      ? completed.map(o => o._type === 'custom' ? customOrderCardHtml(o) : regularOrderCardHtml(o)).join("")
      : `<p class="empty-state">No completed orders yet.</p>`;

    wireLightbox(activeContainer);
    wireLightbox(completedContainer);
  } catch (err) {
    activeContainer.innerHTML = `<p class="empty-state">Could not load orders: ${err.message}</p>`;
    completedContainer.innerHTML = "";
  }
}

document.getElementById("lightboxCloseBtn").addEventListener("click", closeLightbox);
document.getElementById("lightboxModal").addEventListener("click", (e) => {
  if (e.target.id === "lightboxModal") closeLightbox();
});

loadOrders();