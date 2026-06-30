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

// --- EDIT MECHANICS TRACKERS ---
const formHeading = document.getElementById("formHeading");
const cancelEditLink = document.getElementById("cancelEditLink");
let editingProductId = null;
let cachedProductsList = []; // Keeps track of products local data to prefill faster

// Tracks surviving image links during an active product edit session
let activeFormImagesArray = [];
// -------------------------------

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
    <input type="number" min="0" class="v-stock" placeholder="0" value="${prefill.stock_quantity ?? prefill.stockQuantity ?? ""}" />
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

// Renders visual image swatches with quick-delete badges in your form
function renderExistingImagesManager() {
  const container = document.getElementById("existingImagesContainer");
  const grid = document.getElementById("existingImagesGrid");

  if (!container || !grid) return;

  if (activeFormImagesArray.length === 0) {
    container.style.display = "none";
    grid.innerHTML = "";
    return;
  }

  container.style.display = "block";
  grid.innerHTML = activeFormImagesArray
    .map((url, idx) => `
      <div class="preview-thumb-box">
        <img src="${url}" />
        <button type="button" data-idx="${idx}" class="remove-old-img-btn">✕</button>
      </div>
    `).join("");

  grid.querySelectorAll(".remove-old-img-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const indexToRemove = Number(btn.dataset.idx);
      activeFormImagesArray.splice(indexToRemove, 1); // Delete image locally
      renderExistingImagesManager(); // Re-render preview panel layout
    });
  });
}

// Switches form back and forth between Add Mode and Edit Mode
function resetFormState() {
  editingProductId = null;
  activeFormImagesArray = []; // Reset tracked images collection vector
  productForm.reset();
  formHeading.textContent = "Add a new product";
  submitBtn.textContent = "Create product";
  cancelEditLink.style.display = "none";

  // Hide image preview elements on reset via clean class hooks
  const container = document.getElementById("existingImagesContainer");
  const grid = document.getElementById("existingImagesGrid");
  if (container) container.style.display = "none";
  if (grid) grid.innerHTML = "";

  // Hide and clear new local image thumbnails on reset
  const newContainer = document.getElementById("newImagesPreviewContainer");
  const newGrid = document.getElementById("newImagesPreviewGrid");
  if (newContainer) newContainer.style.display = "none";
  if (newGrid) newGrid.innerHTML = "";

  document.getElementById("productImages").required = true; // Images are only mandatory for new products
  variantRows.innerHTML = "";
  addVariantRow();
}

cancelEditLink.addEventListener("click", (e) => {
  e.preventDefault();
  resetFormState();
});

// Triggers when admin clicks the 'Edit' button
function enterEditMode(productId) {
  const product = cachedProductsList.find((p) => p.id == productId);
  if (!product) return;

  editingProductId = productId;
  formHeading.textContent = `Editing: ${product.name}`;
  submitBtn.textContent = "Save Changes";
  cancelEditLink.style.display = "inline";

  // Images are optional during editing updates
  document.getElementById("productImages").required = false;

  // Prefill baseline form properties
  document.getElementById("name").value = product.name || "";
  document.getElementById("description").value = product.description || "";
  document.getElementById("brand").value = product.brand || "";
  document.getElementById("price").value = product.price || 0;
  document.getElementById("gender").value = product.gender || "unisex";
  categorySelect.value = product.category_id || "";

  // Read the current image URLs array from cached product database state
  activeFormImagesArray = product.image_urls ? [...product.image_urls] : [];
  renderExistingImagesManager();

  // Clear and prefill variant entries 
  variantRows.innerHTML = "";
  const variants = product.product_variants || [];
  if (variants.length > 0) {
    variants.forEach(v => addVariantRow(v));
  } else {
    addVariantRow();
  }

  // Auto-scroll admin view up to the form inputs panel
  formHeading.scrollIntoView({ behavior: "smooth" });
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  // 1. ALWAYS use FormData so files can cross the pipeline smoothly
  const formData = new FormData();
  formData.append("name", document.getElementById("name").value.trim());
  formData.append("description", document.getElementById("description").value.trim());
  formData.append("brand", document.getElementById("brand").value.trim());
  formData.append("gender", document.getElementById("gender").value);
  formData.append("categoryId", Number(categorySelect.value) || "");
  formData.append("price", Number(document.getElementById("price").value));

  // 2. Append variants array as a stringified JSON string
  const variantsArray = collectVariants();
  formData.append("variants", JSON.stringify(variantsArray));

  // If editing, send down whatever image selection survived the visual layout management panel
  if (editingProductId) {
    formData.append("existingImages", JSON.stringify(activeFormImagesArray));
  }

  // 3. Check for any brand new uploaded files
  const imageInput = document.getElementById("productImages");
  if (imageInput && imageInput.files.length > 0) {
    for (let i = 0; i < imageInput.files.length; i++) {
      formData.append("images", imageInput.files[i]);
    }
  } else if (!editingProductId && activeFormImagesArray.length === 0) {
    // block submission if it's a new product with zero attachments selected
    showMessage(formMsg, "Please select at least one image file.", "error");
    submitBtn.disabled = false;
    return;
  }

  try {
    let res;

    if (editingProductId) {
      // --- UPDATE CURRENT PRODUCT (PUT) ---
      res = await fetch(`/api/products/${editingProductId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
    } else {
      // --- CREATE NEW PRODUCT (POST) ---
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Operation failed");

    showMessage(formMsg, editingProductId ? "Product updated successfully!" : "Product created with images.", "success");
    resetFormState();
    loadProductList();
  } catch (err) {
    showMessage(formMsg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function toggleActive(id, makeActive) {
  try {
    const res = await fetch(`/api/products/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        isActive: makeActive,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    loadProductList();

  } catch (err) {
    alert(err.message);
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
    cachedProductsList = data.products || [];

    if (!cachedProductsList.length) {
      productList.innerHTML = `<p class="stock-note">No products yet - add one above.</p>`;
      return;
    }

    productList.innerHTML = cachedProductsList
      .map((p) => {
        const totalStock = (p.product_variants || []).reduce((s, v) => s + (v.stock_quantity || 0), 0);

        const firstImage = (p.image_urls && p.image_urls.length > 0) ? p.image_urls[0] : null;

        const imageElement = firstImage
          ? `<img src="${firstImage}" class="product-list-thumb" alt="${p.name}" />`
          : `<div class="product-list-thumb no-img-placeholder">No Image</div>`;

        return `
          <div class="product-list-item">
            <div class="product-list-item-left">
              ${imageElement}
              
              <div class="meta">
                <div class="name">
                  <strong>${p.name}</strong>
                  <span class="badge ${p.is_active ? "active" : "inactive"}">${p.is_active ? "Active" : "Inactive"}</span>
                </div>
                <div class="sub">₹${p.price} · ${p.category ? p.category.name : "Uncategorized"} · ${totalStock} total stock</div>
              </div>
            </div>
            
            <div class="row-actions">
              <button class="btn-secondary edit-btn" data-edit="${p.id}">Edit</button>
              <button class="btn-secondary toggle-btn" data-toggle="${p.id}" data-active="${p.is_active}">
                ${p.is_active ? "Deactivate" : "Activate"}
              </button>
              <button class="btn-danger delete-btn" data-delete="${p.id}" data-name="${p.name}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");

    productList.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => enterEditMode(btn.dataset.edit));
    });

    productList.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.dataset.active === "true";
        toggleActive(btn.dataset.toggle, !isActive);
      });
    });

    productList.querySelectorAll(".delete-btn").forEach((btn) => {
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
  } catch (_) { }
  clearToken();
  window.location.href = "/login.html";
});

// Live local preview generation for brand-new file selections
// Track newly selected files in a state array
let selectedNewFilesArray = [];

document.getElementById("productImages").addEventListener("change", function (e) {
  const container = document.getElementById("newImagesPreviewContainer");
  const grid = document.getElementById("newImagesPreviewGrid");

  if (!container || !grid) return;

  // 🚀 FIX: Append the newly selected files instead of overwriting the array
  const newlyPickedFiles = Array.from(e.target.files);
  selectedNewFilesArray = selectedNewFilesArray.concat(newlyPickedFiles);

  // 🚀 FIX: Sync our master array back to the actual HTML input container
  // This keeps the underlying form input aligned with your queue!
  const dataTransfer = new DataTransfer();
  selectedNewFilesArray.forEach(f => dataTransfer.items.add(f));
  this.files = dataTransfer.files;

  renderNewImagesPreview();
});

// Dedicated function to render new local selections with individual cancel buttons
function renderNewImagesPreview() {
  const container = document.getElementById("newImagesPreviewContainer");
  const grid = document.getElementById("newImagesPreviewGrid");
  const imageInput = document.getElementById("productImages");

  grid.innerHTML = ""; // Clear current grid view

  if (selectedNewFilesArray.length === 0) {
    container.style.display = "none";
    imageInput.value = ""; // Clear input completely if empty
    return;
  }

  container.style.display = "block";

  selectedNewFilesArray.forEach((file, idx) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "preview-thumb-box";
      imgWrapper.innerHTML = `
        <img src="${event.target.result}" title="${file.name}" />
        <button type="button" data-idx="${idx}" class="remove-new-img-btn">✕</button>
      `;

      // Wire up individual cancel event safely using data attributes
      imgWrapper.querySelector(".remove-new-img-btn").addEventListener("click", function () {
        const indexToRemove = Number(this.dataset.idx);

        // Remove from tracking array
        selectedNewFilesArray.splice(indexToRemove, 1);

        // Sync back to the actual HTML input using DataTransfer
        const dataTransfer = new DataTransfer();
        selectedNewFilesArray.forEach(f => dataTransfer.items.add(f));
        imageInput.files = dataTransfer.files;

        // Re-render the updated layout
        renderNewImagesPreview();
      });

      grid.appendChild(imgWrapper);
    };
    reader.readAsDataURL(file);
  });
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

  await loadCategoriesIntoSelect();
  addVariantRow();
  loadProductList();
}

init();