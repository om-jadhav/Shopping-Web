// public/js/products.js
const grid = document.getElementById("grid");
const categoryFilter = document.getElementById("categoryFilter");
const genderFilter = document.getElementById("genderFilter");

async function loadCategories() {
  try {
    const data = await apiGet("/categories");
    for (const cat of data.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      categoryFilter.appendChild(opt);
    }
  } catch (err) {
    console.error("Could not load categories:", err.message);
  }
}

function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML = `<p class="empty-state">No products found.</p>`;
    return;
  }

  grid.innerHTML = products
    .map((p) => {
      const totalStock = (p.product_variants || []).reduce(
        (sum, v) => sum + (v.stock_quantity || 0),
        0
      );
      const outOfStock = totalStock === 0 && (p.product_variants || []).length > 0;

      // 🚀 FIXED: Grab the first image link from your new database array structure
      const firstImage = (p.image_urls && p.image_urls.length > 0) ? p.image_urls[0] : null;

      return `
        <a class="product-card" href="/product-detail.html?id=${p.id}">
          <div class="img-box">
            ${firstImage ? `<img src="${firstImage}" alt="${p.name}" />` : "No image"}
          </div>
          <div class="info">
            <div class="cat-label">${p.category ? p.category.name : "Uncategorized"}</div>
            <h3>${p.name}</h3>
            <div class="price">₹${p.price}</div>
            ${outOfStock ? '<div class="stock-note">Out of stock</div>' : ""}
          </div>
        </a>
      `;
    })
    .join("");
}

async function loadProducts() {
  grid.innerHTML = `<p class="empty-state">Loading…</p>`;
  try {
    const params = new URLSearchParams();
    if (categoryFilter.value) params.set("category", categoryFilter.value);
    if (genderFilter.value) params.set("gender", genderFilter.value);

    const data = await apiGet(`/products?${params.toString()}`);
    renderProducts(data.products);
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Could not load products: ${err.message}</p>`;
  }
}

categoryFilter.addEventListener("change", loadProducts);
genderFilter.addEventListener("change", loadProducts);

loadCategories();
loadProducts();