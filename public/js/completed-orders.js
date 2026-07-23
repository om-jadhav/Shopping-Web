// public/js/completed-orders.js
const token = getToken();
const completedOrderList = document.getElementById("completedOrderList");
const logoutLink = document.getElementById("logoutLink");

function formatOrderDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function designThumbRowHtml(order, label, thumbUrl, hqUrl, filenameSuffix) {
  if (!thumbUrl) return "";
  const downloadUrl = hqUrl || thumbUrl;
  const filename = `order-${order.id}-${filenameSuffix}`;
  return `
    <div class="design-thumb-item">
      <img src="${thumbUrl}" alt="${label}" class="design-thumb-img" />
      <div class="design-thumb-label">${label}</div>
      <button type="button" class="btn-secondary download-btn" data-url="${downloadUrl}" data-filename="${filename}">Download</button>
    </div>
  `;
}

function capitalizeWord(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function placementLabelAdmin(order) {
  const front = order.placement ? `Front - ${capitalizeWord(order.placement)}` : null;
  const back = order.back_placement ? `Back - ${capitalizeWord(order.back_placement)}` : null;
  return [front, back].filter(Boolean).join(", ") || "—";
}

function completedOrderCardHtml(order) {
  const profile = order.profiles || {};

  const thumbRows = [
    designThumbRowHtml(order, "Front design", order.front_design_url, order.front_design_hq_url, "front-design"),
    designThumbRowHtml(order, "Back design", order.back_design_url, order.back_design_hq_url, "back-design"),
    designThumbRowHtml(order, "Front preview", order.front_preview_url, order.front_preview_hq_url, "front-preview"),
    designThumbRowHtml(order, "Back preview", order.back_preview_url, order.back_preview_hq_url, "back-preview"),
  ].filter(Boolean).join("");

  const breakdown = (order.size_breakdown || [])
    .map((row) => `${row.quantity}&times; ${capitalizeWord(row.gender)} ${row.size}`)
    .join(", ");

  const address = [profile.address_line1, profile.address_line2, profile.city, profile.state, profile.postal_code, profile.country]
    .filter(Boolean).join(", ");

  return `
    <div class="custom-order-card">
      <div class="custom-order-top">
        <div class="custom-order-thumbs">
          ${thumbRows}
        </div>
        <div class="custom-order-meta">
          <div class="order-field"><span class="field-label">Customer:</span> ${profile.full_name || "Unknown"}</div>
          <div class="order-field"><span class="field-label">Phone:</span> ${profile.phone || "—"}</div>
          <div class="order-field"><span class="field-label">Address:</span> ${address || "—"}</div>
          <div class="order-field"><span class="field-label">Material:</span> ${order.materials?.name || "—"}</div>
          <div class="order-field"><span class="field-label">Color:</span> ${colorNameFromHex(order.color)}</div>
          <div class="order-field"><span class="field-label">Placement:</span> ${placementLabelAdmin(order)}</div>
          <div class="order-field"><span class="field-label">Quantity:</span> ${breakdown} (${order.total_quantity} total)</div>
          ${order.description ? `<div class="order-field"><span class="field-label">Note:</span> ${order.description}</div>` : ""}
          <div class="order-field"><span class="field-label">Terms Accepted:</span> ${order.terms_accepted ? `Yes (${formatOrderDate(order.terms_accepted_at)})` : "No"}</div>
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatOrderDate(order.created_at)}</div>
          <div class="order-field order-date"><span class="field-label">Completed:</span> ${formatOrderDate(order.status_updated_at)}</div>
        </div>
      </div>

      <div class="custom-order-actions">
        <button class="btn-danger reactivate-btn" data-id="${order.id}">Reactivate order</button>
      </div>
    </div>
  `;
}

async function reactivateOrder(id) {
  try {
    const res = await fetch(`/api/custom-orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "reactivated" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast("Order reactivated.", "success");
    loadCompletedOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadCompletedOrders() {
  try {
    const data = await apiGet("/custom-orders/admin/all", token);
    const orders = (data.orders || []).filter((o) => o.status === "completed");

    if (!orders.length) {
      completedOrderList.innerHTML = `<p class="stock-note">No completed custom orders yet.</p>`;
      return;
    }

    completedOrderList.innerHTML = orders.map(completedOrderCardHtml).join("");

    completedOrderList.querySelectorAll(".download-btn").forEach((btn) => {
      btn.addEventListener("click", () => downloadFile(btn.dataset.url, btn.dataset.filename));
    });

    completedOrderList.querySelectorAll(".reactivate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("Reactivate this order? It will move back to the active Custom Dashboard for rework.")) {
          reactivateOrder(btn.dataset.id);
        }
      });
    });
  } catch (err) {
    completedOrderList.innerHTML = `<p class="stock-note">Could not load completed orders: ${err.message}</p>`;
  }
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await apiPost("/auth/logout", {}, token);
  } catch (_) { }
  clearToken();
  window.location.href = "/login.html";
});

async function init() {
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const data = await apiGet("/auth/me", token);
    if (data.profile?.role !== "admin") {
      window.location.href = "/index.html";
      return;
    }
  } catch (err) {
    clearToken();
    window.location.href = "/login.html";
    return;
  }

  loadCompletedOrders();
}

init();