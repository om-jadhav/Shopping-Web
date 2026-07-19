// public/js/custom-dashboard.js
const token = getToken();
const materialForm = document.getElementById("materialForm");
const formMsg = document.getElementById("formMsg");
const submitBtn = document.getElementById("submitBtn");
const materialList = document.getElementById("materialList");
const logoutLink = document.getElementById("logoutLink");
const formHeading = document.getElementById("formHeading");
const cancelEditLink = document.getElementById("cancelEditLink");

let editingMaterialId = null;
let cachedMaterialsList = [];

function resetFormState() {
  editingMaterialId = null;
  materialForm.reset();
  formHeading.textContent = "Add material";
  submitBtn.textContent = "Add material";
  cancelEditLink.classList.remove("visible");
}

cancelEditLink.addEventListener("click", (e) => {
  e.preventDefault();
  resetFormState();
});

function enterEditMode(materialId) {
  const material = cachedMaterialsList.find((m) => m.id == materialId);
  if (!material) return;

  editingMaterialId = materialId;
  formHeading.textContent = `Editing: ${material.name}`;
  submitBtn.textContent = "Save Changes";
  cancelEditLink.classList.add("visible");

  document.getElementById("materialName").value = material.name || "";
  document.getElementById("materialStock").value = material.stock_quantity ?? 0;

  formHeading.scrollIntoView({ behavior: "smooth" });
}

materialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const name = document.getElementById("materialName").value.trim();
  const stockQuantity = Number(document.getElementById("materialStock").value);

  try {
    if (editingMaterialId) {
      const res = await fetch(`/api/materials/${editingMaterialId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, stockQuantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      showMessage(formMsg, "Material updated successfully!", "success");
    } else {
      await apiPost("/materials", { name, stockQuantity }, token);
      showMessage(formMsg, "Material added successfully!", "success");
    }

    resetFormState();
    loadMaterialList();
  } catch (err) {
    showMessage(formMsg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function quickUpdateStock(id, newStock) {
  try {
    const res = await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stockQuantity: Number(newStock) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    loadMaterialList();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleActive(id, makeActive) {
  try {
    const res = await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: makeActive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    loadMaterialList();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteMaterial(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  try {
    const res = await fetch(`/api/materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Delete failed");
    loadMaterialList();
  } catch (err) {
    alert("Could not delete material: " + err.message);
  }
}

async function loadMaterialList() {
  try {
    const data = await apiGet("/materials/admin/all", token);
    cachedMaterialsList = data.materials || [];

    if (!cachedMaterialsList.length) {
      materialList.innerHTML = `<p class="stock-note">No materials yet - add one above.</p>`;
      return;
    }

    materialList.innerHTML = cachedMaterialsList
      .map((m) => `
        <div class="material-list-item">
          <div class="meta">
            <div class="name">
              <strong>${m.name}</strong>
              <span class="badge ${m.is_active ? "active" : "inactive"}">${m.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div class="sub">${m.stock_quantity} in stock</div>
          </div>

          <div class="stock-inline-form">
            <input type="number" min="0" value="${m.stock_quantity}" data-id="${m.id}" class="stock-quick-input" />
            <button class="btn-secondary stock-save-btn" data-id="${m.id}">Save</button>
          </div>

          <div class="row-actions">
            <button class="btn-secondary edit-btn" data-edit="${m.id}">Edit</button>
            <button class="btn-secondary toggle-btn" data-toggle="${m.id}" data-active="${m.is_active}">
              ${m.is_active ? "Deactivate" : "Activate"}
            </button>
            <button class="btn-danger delete-btn" data-delete="${m.id}" data-name="${m.name}">Delete</button>
          </div>
        </div>
      `)
      .join("");

    materialList.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => enterEditMode(btn.dataset.edit));
    });

    materialList.querySelectorAll(".stock-save-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = materialList.querySelector(`.stock-quick-input[data-id="${btn.dataset.id}"]`);
        quickUpdateStock(btn.dataset.id, input.value);
      });
    });

    materialList.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.dataset.active === "true";
        toggleActive(btn.dataset.toggle, !isActive);
      });
    });

    materialList.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteMaterial(btn.dataset.delete, btn.dataset.name));
    });
  } catch (err) {
    materialList.innerHTML = `<p class="stock-note">Could not load materials: ${err.message}</p>`;
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

// ===== CUSTOM ORDERS =====
const customOrderList = document.getElementById("customOrderList");

const STATUS_OPTIONS = [
  { value: "designing", label: "Designing" },
  { value: "printing", label: "Printing" },
  { value: "shirt_collecting", label: "Shirt Collecting" },
  { value: "shipping", label: "Shipping" },
  { value: "completed", label: "Completed" },
];

function formatOrderDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function updateOrderStatus(id, status) {
  try {
    const res = await fetch(`/api/custom-orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast("Order status updated.", "success");
    loadCustomOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
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

function placementLabelAdmin(order) {
  const front = order.placement ? `Front - ${capitalizeWord(order.placement)}` : null;
  const back = order.back_placement ? `Back - ${capitalizeWord(order.back_placement)}` : null;
  return [front, back].filter(Boolean).join(", ") || "—";
}

function capitalizeWord(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function customOrderCardHtml(order) {
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
          <div class="order-field order-date"><span class="field-label">Placed:</span> ${formatOrderDate(order.created_at)}</div>
        </div>
      </div>

      <div class="custom-order-actions">
        <select class="status-select" data-id="${order.id}">
          ${STATUS_OPTIONS.map((s) => `<option value="${s.value}" ${order.status === s.value ? "selected" : ""}>${s.label}</option>`).join("")}
          ${order.status === "reactivated" ? `<option value="reactivated" selected>Reactivated (reworking)</option>` : ""}
        </select>
        <button class="btn-secondary save-status-btn" data-id="${order.id}">Update status</button>
      </div>
    </div>
  `;
}

async function loadCustomOrders() {
  try {
    const data = await apiGet("/custom-orders/admin/all", token);
    const orders = (data.orders || []).filter((o) => o.status !== "completed");

    if (!orders.length) {
      customOrderList.innerHTML = `<p class="stock-note">No active custom orders right now. Completed ones live on the <a href="/completed-orders.html">Completed Orders</a> page.</p>`;
      return;
    }

    customOrderList.innerHTML = orders.map(customOrderCardHtml).join("");

    customOrderList.querySelectorAll(".save-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const select = customOrderList.querySelector(`.status-select[data-id="${btn.dataset.id}"]`);
        updateOrderStatus(btn.dataset.id, select.value);
      });
    });

    customOrderList.querySelectorAll(".download-btn").forEach((btn) => {
      btn.addEventListener("click", () => downloadFile(btn.dataset.url, btn.dataset.filename));
    });
  } catch (err) {
    customOrderList.innerHTML = `<p class="stock-note">Could not load custom orders: ${err.message}</p>`;
  }
}

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

  loadMaterialList();
  loadCustomOrders();
}

init();