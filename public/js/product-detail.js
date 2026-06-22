// public/js/product-detail.js
const content = document.getElementById("content");

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

  function currentStockHtml() {
    if (!variants.length) {
      return `<p class="stock-note">Stock info not set up for this product yet.</p>`;
    }
    const variant = findVariant(variants, selectedSize, selectedColor);
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

  function render() {
    content.innerHTML = `
      <div class="detail-img">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" />` : "No image"}
      </div>
      <div class="detail-info">
        <a class="back-link" href="/products.html">&larr; Back to shop</a>
        <div class="cat-label">${product.category ? product.category.name : "Uncategorized"}</div>
        <h1>${product.name}</h1>
        <div class="detail-price">₹${product.price}</div>
        <p>${product.description || ""}</p>
        ${sizeSwatchesHtml()}
        ${colorSwatchesHtml()}
        ${currentStockHtml()}
      </div>
    `;

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
  }

  render();
}

async function loadProduct() {
  const id = getProductIdFromUrl();
  if (!id) {
    content.innerHTML = `<p class="empty-state">No product specified.</p>`;
    return;
  }

  try {
    const data = await apiGet(`/products/${id}`);
    renderProduct(data.product);
  } catch (err) {
    content.innerHTML = `<p class="empty-state">Could not load product: ${err.message}</p>`;
  }
}

loadProduct();