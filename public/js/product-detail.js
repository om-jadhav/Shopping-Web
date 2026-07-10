// public/js/product-detail.js
const content = document.getElementById("content");

let currentUserIsAdmin = false;

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function uniqueValues(variants, key) {
  return [...new Set(variants.map((v) => v[key]).filter(Boolean))];
}

function findVariant(variants, size, color) {
  return variants.find(
    (v) => (v.size || null) === (size || null) && (v.color || null) === (color || null)
  );
}

function stockForSize(variants, size, selectedColor) {
  return variants
    .filter((v) => v.size === size && (!selectedColor || v.color === selectedColor))
    .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
}

function stockForColor(variants, color, selectedSize) {
  return variants
    .filter((v) => v.color === color && (!selectedSize || v.size === selectedSize))
    .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
}

function renderProduct(product) {
  const variants = product.product_variants || [];
  const sizes = uniqueValues(variants, "size");
  const colors = uniqueValues(variants, "color");

  let selectedSize = sizes[0] || null;
  let selectedColor = colors[0] || null;
  let quantity = 1;

  const imagesArray =
    product.image_urls ||
    product.imageUrls ||
    (product.image ? [product.image] : []);

  let activeImageIndex = 0;

  function currentVariant() {
    if (!variants.length) return null;
    return findVariant(variants, selectedSize, selectedColor);
  }

  function currentStockHtml() {
    if (!variants.length) {
      return `<p class="stock-note">Stock info not set up for this product yet.</p>`;
    }
    const variant = currentVariant();
    if (!variant) return `<p class="stock-note">This combination isn't available.</p>`;
    return variant.stock_quantity > 0
      ? `<p class="stock-note">${variant.stock_quantity} in stock</p>`
      : `<p class="stock-note">Out of stock for this option</p>`;
  }

  function sizeSwatchesHtml() {
    if (!sizes.length) return "";
    return `
      <div class="option-group">
        <label>Size</label>
        <div class="swatches" id="sizeSwatches">
          ${sizes
            .map((s) => {
              const stock = stockForSize(variants, s, colors.length ? selectedColor : null);
              const isSelected = s === selectedSize;
              const isOut = stock === 0;
              return `<div class="swatch ${isSelected ? "selected" : ""} ${isOut ? "out-of-stock" : ""}" data-size="${s}">${s}</div>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function colorSwatchesHtml() {
    if (!colors.length) return "";
    return `
      <div class="option-group">
        <label>Color</label>
        <div class="swatches" id="colorSwatches">
          ${colors
            .map((c) => {
              const stock = stockForColor(variants, c, sizes.length ? selectedSize : null);
              const isSelected = c === selectedColor;
              const isOut = stock === 0;
              return `<div class="swatch ${isSelected ? "selected" : ""} ${isOut ? "out-of-stock" : ""}" data-color="${c}">${c}</div>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function galleryThumbnailsHtml() {
    if (imagesArray.length <= 1) return "";
    return `
      <div class="gallery-thumbnails" style="display: flex; gap: 8px; margin-top: 12px; overflow-x: auto;">
        ${imagesArray
          .map((url, idx) => {
            const isSelected = idx === activeImageIndex;
            const borderStyle = isSelected ? "2px solid #000" : "1px solid #ddd";
            return `
              <img 
                src="${url}" 
                class="thumb-img" 
                data-index="${idx}" 
                style="width: 60px; height: 60px; object-fit: cover; cursor: pointer; border-radius: 4px; border: ${borderStyle}; opacity: ${isSelected ? "1" : "0.6"}; transition: all 0.2s;"
              />
            `;
          })
          .join("")}
      </div>
    `;
  }

  function addToCartSectionHtml() {
    if (currentUserIsAdmin) return "";

    const variant = currentVariant();
    const outOfStock = variants.length > 0 && (!variant || variant.stock_quantity === 0);
    const maxQty = variant ? variant.stock_quantity : 99;

    return `
      <div class="add-to-cart-section" style="margin-top: 20px; display: flex; gap: 10px; align-items: center;">
        <input
          type="number"
          id="quantityInput"
          value="${quantity}"
          min="1"
          max="${maxQty}"
          style="width: 60px; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.15); background:#1b1b1b; color:#fff;"
        />
        <button id="addToCartBtn" ${outOfStock ? "disabled" : ""} style="flex: 1;">
          ${outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
      <div id="cartMsg" class="message" style="display:none;"></div>
    `;
  }

  function render() {
    const mainImage = imagesArray[activeImageIndex] || null;

    let offerValid = false;
    const pct = parseInt(
      product.offer_percentage ?? product.offer?.percentage ?? product.offers?.percentage ?? 0,
      10
    ) || 0;

    if (pct > 0 && pct <= 100) {
      if (product.end_date || product.offer_end_date) {
        const expiryTime = new Date(product.end_date || product.offer_end_date);
        if (expiryTime > new Date()) {
          offerValid = true;
        }
      } else {
        offerValid = true;
      }
    }

    let detailPriceHtml = `<div class="detail-price">₹${product.price}</div>`;
    if (offerValid) {
      const discountedPrice = Math.round(product.price * (1 - pct / 100));
      detailPriceHtml = `
        <div class="detail-price-container" style="margin-bottom: 16px; display: flex; align-items: baseline; gap: 10px;">
          <span class="detail-sale-price" style="font-size: 1.4rem; color: var(--accent, #ff7a52); font-weight: 700;">₹${discountedPrice}</span>
          <span class="detail-original-price" style="font-size: 1rem; color: var(--muted, #9aa0ad); text-decoration: line-through;">₹${product.price}</span>
          <span style="font-size: 0.8rem; background: rgba(255,107,107,0.15); color: var(--error, #ff6b6b); padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-left: 4px;">${pct}% OFF</span>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="detail-img-container">
        <div class="detail-img">
          ${mainImage ? `<img src="${mainImage}" alt="${product.name}" id="mainDisplayImage" />` : '<div class="no-image-placeholder">No image</div>'}
        </div>
        ${galleryThumbnailsHtml()}
      </div>
      <div class="detail-info">
        <a class="back-link" href="/products.html">&larr; Back to shop</a>
        <div class="cat-label">${product.category ? (typeof product.category === 'object' ? product.category.name : product.category) : "Uncategorized"}</div>
        <h1>${product.name}</h1>
        ${detailPriceHtml}
        <p>${product.description || ""}</p>
        ${sizeSwatchesHtml()}
        ${colorSwatchesHtml()}
        ${currentStockHtml()}
        ${addToCartSectionHtml()}
      </div>
    `;

    document.querySelectorAll(".thumb-img").forEach((el) => {
      el.addEventListener("click", () => {
        activeImageIndex = Number(el.dataset.index);
        render();
      });
    });

    document.querySelectorAll("#sizeSwatches .swatch").forEach((el) => {
      el.addEventListener("click", () => {
        selectedSize = el.dataset.size;
        render();
      });
    });

    document.querySelectorAll("#colorSwatches .swatch").forEach((el) => {
      el.addEventListener("click", () => {
        selectedColor = el.dataset.color;
        render();
      });
    });

    const qtyInput = document.getElementById("quantityInput");
    if (qtyInput) {
      qtyInput.addEventListener("change", () => {
        const max = Number(qtyInput.max) || 99;
        quantity = Math.min(max, Math.max(1, Number(qtyInput.value) || 1));
        qtyInput.value = quantity;
      });
    }

    const addBtn = document.getElementById("addToCartBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => handleAddToCart(product, variants, () => ({
        selectedSize,
        selectedColor,
        quantity,
      })));
    }
  }

  render();
}

async function handleAddToCart(product, variants, getSelection) {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const { selectedSize, selectedColor, quantity } = getSelection();
  const cartMsg = document.getElementById("cartMsg");
  const addBtn = document.getElementById("addToCartBtn");

  let variantId = null;
  if (variants.length) {
    const variant = findVariant(variants, selectedSize, selectedColor);
    if (!variant) {
      cartMsg.style.display = "block";
      cartMsg.className = "message error";
      cartMsg.textContent = "Please select a valid size/color combination.";
      return;
    }
    variantId = variant.id;
  }

  addBtn.disabled = true;
  addBtn.textContent = "Adding...";

  try {
    await apiPost("/cart", {
      product_id: product.id,
      variant_id: variantId,
      quantity,
    }, token);

    window.location.href = "/cart.html";
  } catch (err) {
    addBtn.disabled = false;
    addBtn.textContent = "Add to Cart";
    cartMsg.style.display = "block";
    cartMsg.className = "message error";
    cartMsg.textContent = err.message || "Could not add to cart.";
  }
}

async function checkIfAdmin() {
  const token = getToken();
  if (!token) return false;
  try {
    const data = await apiGet("/auth/me", token);
    return data.profile?.role === "admin";
  } catch (err) {
    return false;
  }
}

async function loadProduct() {
  const id = getProductIdFromUrl();
  if (!id || id === "undefined") {
    content.innerHTML = `<p class="empty-state">No product specified.</p>`;
    return;
  }

  currentUserIsAdmin = await checkIfAdmin();

  try {
    const data = await apiGet(`/products/${encodeURIComponent(id)}`);
    renderProduct(data.product);
  } catch (err) {
    content.innerHTML = `<p class="empty-state">Could not load product: ${err.message}</p>`;
  }
}

loadProduct();