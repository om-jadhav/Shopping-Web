// public/js/bill.js
const billContent = document.getElementById("billContent");

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return { type: params.get("type"), id: params.get("id") };
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function statusLabel(status) {
  const labels = {
    pending: "Pending",
    paid: "Paid",
    failed: "Payment Failed",
    shipped: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
    designing: "Designing",
    printing: "Printing",
    shirt_collecting: "Collecting",
    shipping: "Shipping",
    completed: "Completed",
    reactivated: "Reworking",
  };
  return labels[status] || status;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function renderRegularBill(order, profile) {
  const items = order.order_items || [];
  const rowsHtml = items.map((item) => {
    const product = item.products || {};
    const qty = item.quantity || 1;
    const price = item.price_at_purchase || 0;
    return `
      <tr>
        <td>${escapeHtml(product.name || "Standard Product")}</td>
        <td class="num">${qty}</td>
        <td class="num">₹${price}</td>
        <td class="num">₹${qty * price}</td>
      </tr>
    `;
  }).join("");

  billContent.innerHTML = `
    <div class="bill-sheet">
      <div class="bill-header">
        <div class="bill-brand">IDK<span class="brand-accent">Clothing</span></div>
        <div class="bill-title">
          <h1>Invoice</h1>
          <div class="bill-meta">Order #${escapeHtml(String(order.id).slice(0, 8))}</div>
        </div>
      </div>

      <div class="bill-info-grid">
        <div>
          <div class="bill-label">Billed To</div>
          <div class="bill-value">${escapeHtml(profile?.full_name || "—")}</div>
          <div class="bill-value muted">${escapeHtml(profile?.phone || "")}</div>
          <div class="bill-value muted">${[profile?.address_line1, profile?.address_line2, profile?.city, profile?.state, profile?.postal_code, profile?.country].filter(Boolean).map(escapeHtml).join(", ")}</div>
        </div>
        <div>
          <div class="bill-label">Order Date</div>
          <div class="bill-value">${formatDate(order.created_at)}</div>
          <div class="bill-label" style="margin-top:12px;">Status</div>
          <div class="bill-value">${escapeHtml(statusLabel(order.status))}</div>
        </div>
      </div>

      <table class="bill-table">
        <thead>
          <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Subtotal</th></tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="4">No item details available</td></tr>`}
        </tbody>
      </table>

      <div class="bill-total-row">
        <span>Total Paid</span>
        <span class="bill-total-amount">₹${order.total_amount || 0}</span>
      </div>

      <div class="bill-footer">
        <p>Thank you for shopping with IDKClothing!</p>
        <p class="muted">This is a computer-generated bill and does not require a signature.</p>
      </div>
    </div>
  `;
}

function renderCustomBill(order, profile) {
  const breakdownHtml = (order.size_breakdown || []).map((row) => `
    <tr>
      <td>${escapeHtml(capitalize(row.gender))} ${escapeHtml(row.size)}</td>
      <td class="num">${row.quantity}</td>
    </tr>
  `).join("");

  const placement = [
    order.placement ? `Front - ${capitalize(order.placement)}` : null,
    order.back_placement ? `Back - ${capitalize(order.back_placement)}` : null,
  ].filter(Boolean).join(", ") || "—";

  billContent.innerHTML = `
    <div class="bill-sheet">
      <div class="bill-header">
        <div class="bill-brand">IDK<span class="brand-accent">Clothing</span></div>
        <div class="bill-title">
          <h1>Custom Order Receipt</h1>
          <div class="bill-meta">Order #${escapeHtml(String(order.id).slice(0, 8))}</div>
        </div>
      </div>

      <div class="bill-info-grid">
        <div>
          <div class="bill-label">Billed To</div>
          <div class="bill-value">${escapeHtml(profile?.full_name || "—")}</div>
          <div class="bill-value muted">${escapeHtml(profile?.phone || "")}</div>
          <div class="bill-value muted">${[profile?.address_line1, profile?.address_line2, profile?.city, profile?.state, profile?.postal_code, profile?.country].filter(Boolean).map(escapeHtml).join(", ")}</div>
        </div>
        <div>
          <div class="bill-label">Order Date</div>
          <div class="bill-value">${formatDate(order.created_at)}</div>
          <div class="bill-label" style="margin-top:12px;">Status</div>
          <div class="bill-value">${escapeHtml(statusLabel(order.status))}</div>
        </div>
      </div>

      <div class="bill-info-grid" style="margin-top: 10px;">
        <div>
          <div class="bill-label">Material</div>
          <div class="bill-value">${escapeHtml(order.materials?.name || "—")}</div>
        </div>
        <div>
          <div class="bill-label">Color</div>
          <div class="bill-value">${escapeHtml(colorNameFromHex(order.color))}</div>
        </div>
      </div>

      <div class="bill-info-grid" style="margin-top: 10px;">
        <div>
          <div class="bill-label">Print Placement</div>
          <div class="bill-value">${escapeHtml(placement)}</div>
        </div>
      </div>

      ${order.description ? `
        <div style="margin-top: 10px;">
          <div class="bill-label">Notes</div>
          <div class="bill-value">${escapeHtml(order.description)}</div>
        </div>
      ` : ""}

      <table class="bill-table" style="margin-top: 18px;">
        <thead><tr><th>Size / Gender</th><th class="num">Quantity</th></tr></thead>
        <tbody>
          ${breakdownHtml || `<tr><td colspan="2">No breakdown available</td></tr>`}
        </tbody>
      </table>

      <div class="bill-total-row">
        <span>Total Quantity</span>
        <span class="bill-total-amount">${order.total_quantity || 0}</span>
      </div>

      ${order.total_amount ? `
        <div class="bill-total-row">
          <span>Total Paid</span>
          <span class="bill-total-amount">₹${order.total_amount}</span>
        </div>
      ` : ""}

      <div class="bill-footer">
        <p>Thank you for shopping with IDKClothing!</p>
        <p class="muted">This is a computer-generated bill and does not require a signature.</p>
      </div>
    </div>
  `;
}

async function loadBill() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const { type, id } = getParams();
  if (!type || !id) {
    billContent.innerHTML = `<p class="empty-state">Invalid bill link.</p>`;
    return;
  }

  try {
    const [profileRes, ordersRes] = await Promise.all([
      apiGet("/profile", token),
      type === "custom" ? apiGet("/custom-orders/mine", token) : apiGet("/orders", token),
    ]);

    const profile = profileRes.profile;
    const orders = ordersRes.orders || [];
    const order = orders.find((o) => String(o.id) === String(id));

    if (!order) {
      billContent.innerHTML = `<p class="empty-state">Order not found.</p>`;
      return;
    }

    if (type === "custom") {
      renderCustomBill(order, profile);
    } else {
      renderRegularBill(order, profile);
    }
  } catch (err) {
    billContent.innerHTML = `<p class="empty-state">Could not load bill: ${err.message}</p>`;
  }
}

document.getElementById("printBtn").addEventListener("click", () => window.print());

loadBill();