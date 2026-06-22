// public/js/admin.js
const token = getToken();
const variantRows = document.getElementById("variantRows");
const addVariantBtn = document.getElementById("addVariantBtn");
const productForm = document.getElementById("productForm");
const formMsg = document.getElementById("formMsg");
const submitBtn = document.getElementById("submitBtn");
const productList = document.getElementById("productList");
const categorySelect = document.getElementById("category");
const logoutLink = document.getElementById("logoutLink");

let variantCounter = 0;

function addVariantRow(prefill = {}) {
  variantCounter++;
  const rowId = `variant-${variantCounter}`;
  const row = document.createElement("div");
  row.className = "variant-row";
  row.id = rowId;
  row.innerHTML = `
    <input type="text" class="v-size" placeholder="S, M, One Size..." value="${prefill.size || ""}" />
    <input type="text" class="v-color" placeholder="Black, Navy..." value="${prefill.color || ""}" />
    <input type="number" min="0" class="v-stock" placeholder="0" value="${prefill.stockQuantity ?? ""}" />
    <button type="button" class="remove-variant" title="Remove">✕</button>
  `;
  row.querySelector(".remove-variant").addEventListener("click", () => row.remove());
  variantRows.appendChild(row);
}

addVariantBtn.addEventListener("click", () => addVariantRow());

function collectVariants() {
  return [...variantRows.querySelectorAll(".variant-row")]
    .map((row) => ({
      size: row.querySelector(".v-size").value.trim(),
      color: row.querySelector(".v-color").value.trim(),
      stockQuantity: Number(row.querySelector(".v-stock").value) || 0,
    }))
    .filter((v) => v.size || v.color);
}

async function loadCategoriesIntoSelect() {
  try {
    const data = await apiGet("/categories");
    categorySelect.innerHTML = data.categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  } catch (err) {
    console.error("Could not load categories:", err.message);
  }
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const payload = {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
    brand: document.getElementById("brand").value.trim(),
    gender: document.getElementById("gender").value,
    categoryId: Number(categorySelect.value) || null,
    price: Number(document.getElementById("price").value),
    imageUrl: document.getElementById("imageUrl").value.trim(),
    variants: collectVariants(),
  };

  try {
    await apiPost("/products", payload, token);
    showMessage(formMsg, "Product created.", "success");
    productForm.reset();
    variantRows.innerHTML = "";
    addVariantRow();
    loadProductList();
  } catch (err) {
    showMessage(formMsg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function toggleActive(id, makeActive) {
  try {
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: makeActive }),
    });
    loadProductList();
  } catch (err) {
    alert("Could not update product: " + err.message);
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Delete failed");
    loadProductList();
  } catch (err) {
    alert("Could not delete product: " + err.message);
  }
}

async function loadProductList() {
  try {
    const data = await apiGet("/products/admin/all", token);
    if (!data.products.length) {
      productList.innerHTML = `<p class="stock-note">No products yet - add one above.</p>`;
      return;
    }

    productList.innerHTML = data.products
      .map((p) => {
        const totalStock = (p.product_variants || []).reduce((s, v) => s + (v.stock_quantity || 0), 0);
        return `
          <div class="product-list-item">
            <div class="meta">
              <div class="name">
                ${p.name}
                <span class="badge ${p.is_active ? "active" : "inactive"}">${p.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div class="sub">₹${p.price} · ${p.category ? p.category.name : "Uncategorized"} · ${totalStock} total stock</div>
            </div>
            <div class="row-actions">
              <button class="btn-secondary" data-toggle="${p.id}" data-active="${p.is_active}">
                ${p.is_active ? "Deactivate" : "Activate"}
              </button>
              <button class="btn-danger" data-delete="${p.id}" data-name="${p.name}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");

    productList.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.dataset.active === "true";
        toggleActive(btn.dataset.toggle, !isActive);
      });
    });
    productList.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.delete, btn.dataset.name));
    });
  } catch (err) {
    productList.innerHTML = `<p class="stock-note">Could not load products: ${err.message}</p>`;
  }
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await apiPost("/auth/logout", {}, token);
  } catch (_) {}
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

  await loadCategoriesIntoSelect();
  addVariantRow();
  loadProductList();
}

init();