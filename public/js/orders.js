// public/js/orders.js

const STATUS_STEPS = [
  { key: "designing", label: "Designing" },
  { key: "printing", label: "Printing" },
  { key: "shirt_collecting", label: "Collecting" },
  { key: "shipping", label: "Shipping" },
  { key: "completed", label: "Completed" },
];

function statusStepperHtml(status) {
  // 'reactivated' isn't a pipeline stage - it means admin reopened a
  // completed order for rework. Show a note instead of a broken stepper.
  if (status === "reactivated") {
    return `<div class="reactivated-note">This order was reopened for changes and is being reworked.</div>`;
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  return `
    <div class="status-stepper">
      ${STATUS_STEPS.map((s, idx) => {
        let cls = "";
        if (idx < currentIdx) cls = "done";
        else if (idx === currentIdx) cls = "current";
        return `<div class="status-step ${cls}"><div class="dot"></div>${s.label}</div>`;
      }).join("")}
    </div>
  `;
}

function formatDate(iso) {
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

function orderCardHtml(order) {
  const thumbs = [order.front_preview_url, order.back_preview_url].filter(Boolean);
  const breakdown = (order.size_breakdown || [])
    .map((row) => `${row.quantity}&times; ${capitalize(row.gender)} ${row.size}`)
    .join(", ");

  const isCompleted = order.status === "completed";

  return `
    <div class="order-card">
      <div class="order-type-badge">Custom Order</div>
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
      ${statusStepperHtml(order.status)}
    </div>
  `;
}

// ---- Lightbox for enlarging thumbnails ----
function openLightbox(src) {
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

async function loadOrders() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const activeContainer = document.getElementById("activeOrdersList");
  const completedContainer = document.getElementById("completedOrdersList");

  try {
    const data = await apiGet("/custom-orders/mine", token);
    const orders = data.orders || [];

    const active = orders.filter((o) => o.status !== "completed");
    const completed = orders.filter((o) => o.status === "completed");

    activeContainer.innerHTML = active.length
      ? active.map(orderCardHtml).join("")
      : `<p class="empty-state">No active custom orders right now. <a href="/customize.html">Start designing one</a>.</p>`;

    completedContainer.innerHTML = completed.length
      ? completed.map(orderCardHtml).join("")
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