// public/js/cart.js
const cartContent = document.getElementById("cartContent");

function itemPercentage(item) {
  return parseInt(item.products?.offer_percentage ?? 0, 10) || 0;
}

function itemPrice(item) {
  const product = item.products;
  const pct = itemPercentage(item);
  const base = product?.price || 0;
  return pct > 0 ? Math.round(base * (1 - pct / 100)) : base;
}

function renderCart(items) {
  if (!items.length) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <a href="/products.html" class="back-link">&larr; Continue shopping</a>
      </div>
    `;
    return;
  }

  const availableItems = items.filter((item) => item.products?.is_active !== false);
  const unavailableItems = items.filter((item) => item.products?.is_active === false);

  const total = availableItems.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);

  cartContent.innerHTML = `
    <div class="cart-items">
      ${items.map((item) => {
        const product = item.products;
        const variant = item.product_variants;
        const image = product?.image_urls?.[0];
        const price = itemPrice(item);
        const pct = itemPercentage(item);
        const maxQty = variant ? variant.stock_quantity : 99;
        const unavailable = product?.is_active === false;

        return `
          <div class="cart-item ${unavailable ? "cart-item-unavailable" : ""}" data-id="${item.id}">
            <div class="cart-item-img">
              ${image ? `<img src="${image}" alt="${product?.name || ""}" />` : '<div class="no-image-placeholder">No image</div>'}
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${product?.name || "Unknown product"}</div>
              ${variant ? `<div class="cart-item-variant">${[variant.size, variant.color].filter(Boolean).join(" / ")}</div>` : ""}
              ${unavailable
                ? `<div class="cart-item-unavailable-badge">No longer available</div>`
                : pct > 0
                  ? `
                    <div class="cart-item-price">
                      <span class="cart-item-price-discounted">₹${price}</span>
                      <span class="cart-item-price-original">₹${product?.price}</span>
                    </div>
                    <div class="cart-item-offer-name">${product?.offer_name || `${pct}% OFF`}</div>
                  `
                  : `<div class="cart-item-price">₹${price}</div>`
              }
            </div>
            <div class="cart-item-controls">
              ${unavailable
                ? ""
                : `<input type="number" class="cart-qty-input" min="1" max="${maxQty}" value="${item.quantity}" data-id="${item.id}" />`
              }
              <button class="cart-remove-btn" data-id="${item.id}">Remove</button>
            </div>
            <div class="cart-item-subtotal">${unavailable ? "" : "₹" + price * item.quantity}</div>
          </div>
        `;
      }).join("")}
    </div>
    ${unavailableItems.length > 0
      ? `<p class="cart-notice">${unavailableItems.length} item(s) in your cart are no longer available and are excluded from your total.</p>`
      : ""
    }
    <div class="cart-total">
      <span>Total</span>
      <span>₹${total}</span>
    </div>
    <button id="checkoutBtn" ${unavailableItems.length > 0 ? "disabled" : ""}>
      ${unavailableItems.length > 0 ? "Remove unavailable items to checkout" : "Proceed to Checkout"}
    </button>
  `;

  document.querySelectorAll(".cart-qty-input").forEach((input) => {
    input.addEventListener("change", () => handleUpdateQuantity(input.dataset.id, input.value));
  });

  document.querySelectorAll(".cart-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleRemoveItem(btn.dataset.id));
  });

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", handleCheckout);
  }
}

async function loadCart() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const data = await apiGet("/cart", token);
    renderCart(data.items || []);
  } catch (err) {
    cartContent.innerHTML = `<p class="empty-state">Could not load cart: ${err.message}</p>`;
  }
}

async function handleUpdateQuantity(id, value) {
  const token = getToken();
  const quantity = Math.max(1, Number(value) || 1);

  try {
    const res = await fetch(`/api/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || "Could not update quantity.");
    }
    loadCart();
  } catch (err) {
    console.error(err);
    loadCart();
  }
}

async function handleRemoveItem(id) {
  const token = getToken();

  try {
    await fetch(`/api/cart/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadCart();
  } catch (err) {
    console.error(err);
  }
}

async function handleCheckout() {
  const token = getToken();
  const checkoutBtn = document.getElementById("checkoutBtn");

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Placing order...";

  try {
    const res = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Checkout failed.");
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Proceed to Checkout";
      return;
    }

    alert("Order placed successfully!");
    window.location.href = "/products.html";
  } catch (err) {
    console.error(err);
    alert("Something went wrong during checkout.");
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Proceed to Checkout";
  }
}

loadCart();