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
}

init();