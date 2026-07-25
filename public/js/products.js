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

function renderProductCard(product) {
    const id = product._id || product.id;
    if (!id) return;

    const imageUrl =
        (product.image_urls && product.image_urls[0]) ||
        (product.imageUrls && product.imageUrls[0]) ||
        product.image ||
        "images/placeholder.png";

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
        <a href="product-detail.html?id=${encodeURIComponent(id)}">
            <img src="${imageUrl.startsWith("http") ? imageUrl : `/uploads/${imageUrl}`}" alt="${(product.name || "").replace(/"/g, "")}" />
            <h3>${product.name || ""}</h3>
        </a>
        <div class="price">₹${product.price ?? ""}</div>
    `;
    return card;
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

function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML = `<p class="empty-state">No products found.</p>`;
    return;
  }

  grid.innerHTML = products
    .map((p) => {
      const productId = p._id || p.id;
      if (!productId) return "";

      const firstImage =
        (p.image_urls && p.image_urls.length > 0 && p.image_urls[0]) ||
        (p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0]) ||
        null;

      const totalStock = (p.product_variants || p.variants || []).reduce(
        (sum, v) => sum + (v.stock_quantity || v.stock || 0),
        0
      );
      const outOfStock =
        totalStock === 0 && (p.product_variants || p.variants || []).length > 0;

      let offerValid = false;
      const pct = parseInt(
        p.offer_percentage ?? p.offer?.percentage ?? p.offers?.percentage ?? 0,
        10
      ) || 0;

      if (pct > 0 && pct <= 100) {
        if (p.end_date || p.offer_end_date) {
          const expiryTime = new Date(p.end_date || p.offer_end_date);
          if (expiryTime > new Date()) {
            offerValid = true;
          }
        } else {
          offerValid = true;
        }
      }

      const offerName = p.offer?.name || p.offers?.name || "";

      let priceHtml = `<div class="price">₹${p.price}</div>`;
      let offerBadgeHtml = "";

      if (offerValid) {
        const discountedPrice = Math.round(p.price * (1 - pct / 100));
        priceHtml = `
          <div class="price-container" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="sale-price" style="color: var(--accent, #ff7a52); font-weight: 700;">₹${discountedPrice}</span>
            <span class="original-price" style="color: var(--muted, #9aa0ad); text-decoration: line-through; font-size: 0.85rem;">₹${p.price}</span>
          </div>
        `;
        offerBadgeHtml = `<span class="shop-offer-tag" style="position: absolute; top: 8px; right: 8px; background: var(--error, #ff6b6b); color: #fff; font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 4px; z-index: 5;">${offerName ? `${offerName} · ` : ""}${pct}% OFF</span>`;
      }

      return `
        <a class="product-card" href="/product-detail.html?id=${encodeURIComponent(productId)}" style="position: relative;">
          ${offerBadgeHtml}
          <div class="img-box">
            ${firstImage
              ? `<img src="${firstImage.startsWith("http") ? firstImage : `/uploads/${firstImage}`}" alt="${p.name}" />`
              : "No image"}
          </div>
          <div class="info">
            <div class="cat-label">${p.category ? (typeof p.category === "object" ? p.category.name : p.category) : "Uncategorized"}</div>
            <h3>${p.name}</h3>
            ${priceHtml}
            ${outOfStock ? '<div class="stock-note" style="margin-top: 6px;">Out of stock</div>' : ""}
          </div>
        </a>
      `;
    })
    .join("");
}

categoryFilter.addEventListener("change", loadProducts);
genderFilter.addEventListener("change", loadProducts);

loadCategories();
loadProducts();