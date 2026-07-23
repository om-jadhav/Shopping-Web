// public/js/admin-orders.js
const token = getToken();
const adminOrdersList = document.getElementById("adminOrdersList");
const logoutLink = document.getElementById("logoutLink");

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderOrderCard(order) {
  const profile = order.profiles || order.user || {};
  const items = order.order_items || [];

  const address = [profile.address_line1, profile.address_line2, profile.city, profile.state, profile.postal_code, profile.country]
    .filter(Boolean).join(", ");

  const itemsHtml = items.map(item => {
    const product = item.products || {};
    const img = Array.isArray(product.image_urls) ? product.image_urls[0] : (product.image_urls || '/images/placeholder.png');
    return `
      <div class="regular-item-row" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <img src="${img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" />
        <div>
          <div><strong>${product.name || 'Product'}</strong></div>
          <small>Qty: ${item.quantity || 1} | Price: ₹${item.price_at_purchase || 0}</small>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="custom-order-card" style="border: 1px solid rgba(255,255,255,0.1); padding: 15px; margin-bottom: 15px; border-radius: 8px;">
      <div style="display:flex; justify-between; align-items:flex-start; wrap:wrap; gap:15px;">
        <div style="flex:1; min-width:250px;">
          <h3>Order #${String(order.id).slice(0, 8)}</h3>
          <p><strong>Customer:</strong> ${profile.full_name || "Unknown"} (${profile.phone || "No phone"})</p>
          <p><strong>Shipping Address:</strong> ${address || "—"}</p>
          <p><strong>Date Placed:</strong> ${formatDate(order.created_at)}</p>
          <p><strong>Total Amount:</strong> ₹${order.total_amount || 0}</p>
        </div>

        <div style="flex:1; min-width:250px;">
          <h4>Ordered Items</h4>
          ${itemsHtml.length ? itemsHtml : '<div>No items info available</div>'}
        </div>

        <div style="min-width:180px;">
          <label><strong>Status:</strong></label>
          <select class="status-select" data-id="${order.id}" style="width:100%; padding:8px; margin-top:5px; margin-bottom:10px;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button class="btn-primary update-status-btn" data-id="${order.id}" style="width:100%;">Update Status</button>
        </div>
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update status");
    showToast("Order status updated successfully!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadAdminOrders() {
  try {
    const data = await apiGet("/orders/admin/all", token);
    const orders = data.orders || [];

    if (!orders.length) {
      adminOrdersList.innerHTML = `<p class="stock-note">No store orders placed yet.</p>`;
      return;
    }

    adminOrdersList.innerHTML = orders.map(renderOrderCard).join("");

    adminOrdersList.querySelectorAll(".update-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const orderId = btn.dataset.id;
        const selectEl = adminOrdersList.querySelector(`.status-select[data-id="${orderId}"]`);
        if (selectEl) {
          updateOrderStatus(orderId, selectEl.value);
        }
      });
    });
  } catch (err) {
    adminOrdersList.innerHTML = `<p class="stock-note">Could not load orders: ${err.message}</p>`;
  }
}

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    try { await apiPost("/auth/logout", {}, token); } catch (_) {}
    clearToken();
    window.location.href = "/login.html";
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

  loadAdminOrders();
}

init();