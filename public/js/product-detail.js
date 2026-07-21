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
// Clean & normalize strings (handles " S ", "s", "S")
function norm(str) {
  return str ? String(str).trim().toLowerCase() : "";
}

function uniqueValues(variants, key) {
  const seen = new Set();
  const result = [];
  variants.forEach((v) => {
    const val = v[key];
    if (val) {
      const normalized = norm(val);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(String(val).trim()); // Keep original casing for display
      }
    }
  });
  return result;
}

function findVariant(variants, size, color) {
  return variants.find(
    (v) =>
      (!size || norm(v.size) === norm(size)) &&
      (!color || norm(v.color) === norm(color))
  );
}

function stockForSize(variants, size, selectedColor) {
  return variants
    .filter(
      (v) =>
        norm(v.size) === norm(size) &&
        (!selectedColor || norm(v.color) === norm(selectedColor))
    )
    .reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
}

function stockForColor(variants, color, selectedSize) {
  return variants
    .filter(
      (v) =>
        norm(v.color) === norm(color) &&
        (!selectedSize || norm(v.size) === norm(selectedSize))
    )
    .reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
}

function starsHtml(rating) {
  const numericRating = Number(rating) || 0;
  const fullStars = Math.floor(numericRating);
  const hasHalf = numericRating % 1 >= 0.5;
  let html = "";
  for (let i = 0; i < fullStars; i++) html += '<i class="fa-solid fa-star"></i>';
  if (hasHalf) html += '<i class="fa-solid fa-star-half-stroke"></i>';
  const emptyStars = 5 - Math.ceil(numericRating);
  for (let i = 0; i < Math.max(0, emptyStars); i++) html += '<i class="fa-regular fa-star"></i>';
  return html;
}

// Universal parser for product images from backend
function parseProductImages(product) {
  let rawImages =
    product.images ||
    product.image_urls ||
    product.imageUrls ||
    product.product_images ||
    product.image ||
    product.imageUrl ||
    [];

  // If stored as JSON string in DB
  if (typeof rawImages === "string") {
    try {
      rawImages = JSON.parse(rawImages);
    } catch (e) {
      // If comma separated string
      if (rawImages.includes(",")) {
        rawImages = rawImages.split(",").map((img) => img.trim());
      } else {
        rawImages = [rawImages];
      }
    }
  }

  if (!Array.isArray(rawImages)) {
    rawImages = [rawImages];
  }

  // Extract string URLs if images are objects
  const urls = rawImages
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      return item.url || item.image_url || item.src || null;
    })
    .filter(Boolean);

  return urls.length > 0 ? urls : ["https://via.placeholder.com/600?text=No+Image"];
}

function renderProduct(product) {
  const variants = product.product_variants || product.variants || [];
  const sizes = uniqueValues(variants, "size");
  const colors = uniqueValues(variants, "color");

  let selectedSize = sizes[0] || null;
  let selectedColor = colors[0] || null;
  let quantity = 1;

  const imagesArray = parseProductImages(product);
  let activeImageIndex = 0;

  function currentVariant() {
    if (!variants.length) return null;
    return findVariant(variants, selectedSize, selectedColor);
  }

  function sizeSwatchesHtml() {
    if (!sizes.length) return "";
    return `
      <div class="option-group">
        <label class="info-label">Size</label>
        <div class="size-selector" id="sizeSwatches">
          ${sizes
            .map((s) => {
              const stock = stockForSize(variants, s, colors.length ? selectedColor : null);
              const isSelected = s === selectedSize;
              const isOut = stock === 0;
              return `<button type="button" class="size-option ${isSelected ? "active" : ""} ${isOut ? "out-of-stock" : ""}" data-size="${s}">${s}</button>`;
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
        <label class="info-label">Color</label>
        <div class="color-selector" id="colorSwatches">
          ${colors
            .map((c) => {
              const stock = stockForColor(variants, c, sizes.length ? selectedSize : null);
              const isSelected = c === selectedColor;
              const isOut = stock === 0;
              
              const colorLower = c.toLowerCase();
              let styleAttr = `background:${c};`;
              let extraClass = "";
              if (colorLower === "white") extraClass = "color-white";
              else if (colorLower === "black") extraClass = "color-black";

              return `<div class="color-option ${extraClass} ${isSelected ? "active" : ""} ${isOut ? "out-of-stock" : ""}" style="${styleAttr}" data-color="${c}" title="${c}"></div>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function galleryThumbnailsHtml() {
    if (imagesArray.length <= 1) return "";
    return `
      <div class="thumbnail-row">
        ${imagesArray
          .map((url, idx) => {
            const isSelected = idx === activeImageIndex;
            return `
              <div class="thumbnail ${isSelected ? "active" : ""}" data-index="${idx}">
                <img src="${url}" alt="Thumbnail ${idx + 1}" />
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function currentStockHtml() {
    if (!variants.length) {
      if (product.stock_quantity !== undefined) {
        return product.stock_quantity > 0
          ? `<div class="stock">In Stock <span>(${product.stock_quantity} available)</span></div>`
          : `<div class="stock out">Out of Stock</div>`;
      }
      return `<div class="stock">In Stock</div>`;
    }
    const variant = currentVariant();
    if (!variant) return `<div class="stock out">Selected combination unavailable</div>`;
    return variant.stock_quantity > 0
      ? `<div class="stock">In Stock <span>(${variant.stock_quantity} left)</span></div>`
      : `<div class="stock out">Out of Stock for selected option</div>`;
  }

  function addToCartSectionHtml() {
    if (currentUserIsAdmin) return "";

    const variant = currentVariant();
    const outOfStock = variants.length > 0 && (!variant || variant.stock_quantity === 0);
    const maxQty = variant ? variant.stock_quantity : (product.stock_quantity || 99);

    return `
      <div class="purchase-card">
        ${sizeSwatchesHtml()}
        ${colorSwatchesHtml()}

        <div class="option-group">
          <label class="info-label">Quantity</label>
          <div class="quantity-row">
            <div class="quantity-box">
              <button class="quantity-btn" id="qtyMinus" type="button">-</button>
              <input type="number" id="quantityInput" class="quantity-input" value="${quantity}" min="1" max="${maxQty}" readonly />
              <button class="quantity-btn" id="qtyPlus" type="button">+</button>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button id="addToCartBtn" class="btn-cart" ${outOfStock ? "disabled" : ""}>
            <i class="fa-solid fa-cart-shopping"></i> ${outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <button id="buyNowBtn" class="btn-buy" ${outOfStock ? "disabled" : ""}>
            <i class="fa-solid fa-bolt"></i> Buy Now
          </button>
        </div>

        <div class="secure-payment">
          <i class="fa-solid fa-shield-halved"></i> 100% Secure Payment
        </div>
        <div id="cartMsg" class="message" style="display:none;"></div>
      </div>
    `;
  }

  function render() {
    const mainImage = imagesArray[activeImageIndex];

    let offerValid = false;
    const pct = parseInt(
      product.offer_percentage ?? product.offer?.percentage ?? product.offers?.percentage ?? 0,
      10
    ) || 0;

    if (pct > 0 && pct <= 100) {
      if (product.end_date || product.offer_end_date) {
        const expiryTime = new Date(product.end_date || product.offer_end_date);
        if (expiryTime > new Date()) offerValid = true;
      } else {
        offerValid = true;
      }
    }

    let detailPriceHtml = `<div class="price-row"><span class="current-price">₹${product.price}</span></div>`;
    if (offerValid) {
      const discountedPrice = Math.round(product.price * (1 - pct / 100));
      detailPriceHtml = `
        <div class="price-row">
          <span class="current-price">₹${discountedPrice}</span>
          <span class="old-price">₹${product.price}</span>
          <span class="discount-chip">${pct}% OFF</span>
        </div>
      `;
    }

    const categoryName = product.category
      ? (typeof product.category === "object" ? product.category.name : product.category)
      : "";

    content.innerHTML = `
      <a class="back-link" href="/products.html">
        <i class="fa-solid fa-arrow-left"></i> Back to Shop
      </a>

      <div class="product-detail">
        <!-- Gallery -->
        <div class="product-gallery">
          <div class="main-image">
            ${offerValid ? `<span class="sale-badge">${pct}% OFF</span>` : ""}
            <button class="wishlist-btn" id="wishlistTopBtn" aria-label="Add to Wishlist">
              <i class="fa-regular fa-heart"></i>
            </button>
            <img src="${mainImage}" alt="${product.name}" id="mainDisplayImage" />
          </div>
          ${galleryThumbnailsHtml()}
        </div>

        <!-- Info Column -->
        <div class="product-info">
          ${categoryName ? `<div class="product-category">${categoryName}</div>` : ""}
          <h1 class="product-title">${product.name}</h1>
          
          <!-- Dynamic Header Rating Placeholder -->
          <div class="product-rating" id="headerRatingContainer">
            <span class="stars">${starsHtml(0)}</span>
            <span>No ratings yet</span>
          </div>

          ${detailPriceHtml}
          ${currentStockHtml()}

          <div class="delivery-info">
              <i class="fa-solid fa-shield-heart"></i> Safe & Insured Shipping
          </div>

          ${addToCartSectionHtml()}
        </div>
      </div>

      <!-- Description Section -->
      <div class="detail-sections">
        <div class="detail-tabs">
          <div class="detail-tab active" data-tab="tab-description">Description</div>
          ${product.specifications ? `<div class="detail-tab" data-tab="tab-details">Details</div>` : ""}
          <div class="detail-tab" data-tab="tab-shipping">Shipping & Returns</div>
        </div>

        <div class="description-box">
          <div id="tab-description" class="tab-content active">
            <p>${product.description || "No description provided for this product."}</p>
          </div>
          ${
            product.specifications
              ? `<div id="tab-details" class="tab-content" style="display:none;"><p>${product.specifications}</p></div>`
              : ""
          }
          <div id="tab-shipping" class="tab-content" style="display:none;">
            <p>Free standard delivery on eligible orders. Standard 7-day hassle-free return policy applies.</p>
          </div>
        </div>

        <div class="feature-grid">
          <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon"><i class="fa-solid fa-box-tissue"></i></div>
            <div class="feature-title">Safe Delivery</div>
            <div class="feature-text">Secure & careful packaging</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><i class="fa-solid fa-rotate-left"></i></div>
            <div class="feature-title">Easy Returns</div>
            <div class="feature-text">Hassle-free process</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="feature-title">Secure Payment</div>
            <div class="feature-text">100% protected checkout</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><i class="fa-solid fa-award"></i></div>
            <div class="feature-title">Quality Assured</div>
            <div class="feature-text">Verified products</div>
          </div>
        </div>
        </div>
      </div>

      <!-- Dynamic Reviews Section -->
      <div id="reviewsSection"></div>
    `;

    // Direct Image Switch Listener (without re-rendering whole page)
    document.querySelectorAll(".thumbnail").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.dataset.index);
        activeImageIndex = idx;
        
        const mainImg = document.getElementById("mainDisplayImage");
        if (mainImg) mainImg.src = imagesArray[idx];

        document.querySelectorAll(".thumbnail").forEach((t) => t.classList.remove("active"));
        el.classList.add("active");
      });
    });

    // Size Swatch Click Handler
    document.querySelectorAll("#sizeSwatches .size-option").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        selectedSize = el.dataset.size;

        // Auto-adjust color if current color isn't available in the new size
        if (colors.length) {
          const matchingVariant = variants.find(
            (v) => norm(v.size) === norm(selectedSize) && (v.stock_quantity || 0) > 0
          );
          if (matchingVariant && matchingVariant.color) {
            selectedColor = matchingVariant.color;
          }
        }

        render();
      });
    });

    // Color Swatch Click Handler
    document.querySelectorAll("#colorSwatches .color-option").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        selectedColor = el.dataset.color;

        // Auto-adjust size if current size isn't available in the new color
        if (sizes.length) {
          const matchingVariant = variants.find(
            (v) => norm(v.color) === norm(selectedColor) && (v.stock_quantity || 0) > 0
          );
          if (matchingVariant && matchingVariant.size) {
            selectedSize = matchingVariant.size;
          }
        }

        render();
      });
    });

    // Quantity Handlers
    const qtyInput = document.getElementById("quantityInput");
    const qtyMinus = document.getElementById("qtyMinus");
    const qtyPlus = document.getElementById("qtyPlus");

    if (qtyInput && qtyMinus && qtyPlus) {
      qtyMinus.addEventListener("click", () => {
        if (quantity > 1) {
          quantity--;
          qtyInput.value = quantity;
        }
      });

      qtyPlus.addEventListener("click", () => {
        const variant = currentVariant();
        const max = variant ? variant.stock_quantity : (product.stock_quantity || 99);
        if (quantity < max) {
          quantity++;
          qtyInput.value = quantity;
        }
      });
    }

    // Tab Switcher
    document.querySelectorAll(".detail-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const target = tab.dataset.tab;
        document.querySelectorAll(".description-box .tab-content").forEach((tc) => {
          tc.style.display = tc.id === target ? "block" : "none";
        });
      });
    });

    // Cart / Buy Now
    const addBtn = document.getElementById("addToCartBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () =>
        handleAddToCart(product, variants, () => ({ selectedSize, selectedColor, quantity }), false)
      );
    }

    const buyBtn = document.getElementById("buyNowBtn");
    if (buyBtn) {
      buyBtn.addEventListener("click", () =>
        handleAddToCart(product, variants, () => ({ selectedSize, selectedColor, quantity }), true)
      );
    }
  }

  render();
  loadReviews(product.id);
}

async function handleAddToCart(product, variants, getSelection, isBuyNow = false) {
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
      if (cartMsg) {
        cartMsg.style.display = "block";
        cartMsg.className = "message error";
        cartMsg.textContent = "Please select a valid size/color combination.";
      }
      return;
    }
    variantId = variant.id;
  }

  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = "Processing...";
  }

  try {
    await apiPost(
      "/cart",
      {
        product_id: product.id,
        variant_id: variantId,
        quantity,
      },
      token
    );

    window.location.href = isBuyNow ? "/checkout.html" : "/cart.html";
  } catch (err) {
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = "Add to Cart";
    }
    if (cartMsg) {
      cartMsg.style.display = "block";
      cartMsg.className = "message error";
      cartMsg.textContent = err.message || "Could not complete request.";
    }
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
    renderProduct(data.product || data);
  } catch (err) {
    content.innerHTML = `<p class="empty-state">Could not load product: ${err.message}</p>`;
  }
}

async function loadReviews(productId) {
  const reviewsSection = document.getElementById("reviewsSection");
  const headerRating = document.getElementById("headerRatingContainer");
  if (!reviewsSection) return;

  try {
    const data = await apiGet(`/reviews/${productId}`);
    const reviews = data.reviews || (Array.isArray(data) ? data : []);

    if (!reviews || reviews.length === 0) {
      reviewsSection.innerHTML = `
        <div class="reviews-section">
          <h2>Customer Reviews</h2>
          <p style="color: var(--muted, #9aa0ad);">No reviews yet for this product.</p>
        </div>
      `;
      if (headerRating) {
        headerRating.innerHTML = `<span class="stars">${starsHtml(0)}</span> <span>No reviews yet</span>`;
      }
      return;
    }

    // Dynamic calculations
    const totalCount = reviews.length;
    const totalScore = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    const avgRating = (totalScore / totalCount).toFixed(1);

    // Update Header Rating Dynamically
    if (headerRating) {
      headerRating.innerHTML = `
        <span class="stars">${starsHtml(avgRating)}</span>
        <span>${avgRating} (${totalCount} review${totalCount > 1 ? "s" : ""})</span>
      `;
    }

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });

    reviewsSection.innerHTML = `
      <div class="reviews-section">
        <h2>Customer Reviews</h2>
        <div class="review-grid">
          
          <div class="rating-summary">
            <div class="rating-number">${avgRating}</div>
            <div class="rating-stars">${starsHtml(avgRating)}</div>
            <div class="rating-count">Based on ${totalCount} review${totalCount > 1 ? "s" : ""}</div>
            
            <div class="rating-bars" style="margin-top: 15px;">
              ${[5, 4, 3, 2, 1]
                .map((star) => {
                  const cnt = counts[star] || 0;
                  const pct = Math.round((cnt / totalCount) * 100);
                  return `
                    <div class="bar-row">
                      <span>${star}★</span>
                      <div class="bar-track"><div class="bar-fill" style="width: ${pct}%;"></div></div>
                      <span>(${cnt})</span>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>

          <div class="review-list">
            ${reviews
              .map(
                (r) => `
              <div class="review-card">
                <div class="review-avatar">${(r.user_name || r.user?.name || "U")[0].toUpperCase()}</div>
                <div class="review-body">
                  <h4>${r.user_name || r.user?.name || "Verified Customer"}</h4>
                  <div class="review-stars">${starsHtml(r.rating || 5)}</div>
                  <div class="review-time">${r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recently"}</div>
                  ${r.comment ? `<div class="review-text">${r.comment}</div>` : ""}
                </div>
              </div>
            `
              )
              .join("")}
          </div>

        </div>
      </div>
    `;
  } catch (err) {
    reviewsSection.innerHTML = `
      <div class="reviews-section">
        <p style="color: var(--muted, #9aa0ad);">Unable to load reviews at this time.</p>
      </div>
    `;
  }
}

loadProduct();