let selectedProductIds = new Set();
let allProducts = [];
let filteredProducts = [];
let isEditing = false;
let currentEditId = null;

const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("sb_access_token") || localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "", ...options.headers }
    });
};

document.addEventListener("DOMContentLoaded", () => {
    fetchInventory();
    loadOffers();
    setupEventListeners();
});

// Centralized UI Update Function
function updateUI() {
    document.getElementById("selectionCount").textContent = `${selectedProductIds.size} products selected`;

    // Toggle edit mode UI
    document.getElementById("cancelEditBtn").classList.toggle("hidden", !isEditing);
    document.getElementById("submitOfferBtn").textContent = isEditing ? "Update Campaign" : "Create & Apply Offer";
}

function resetForm() {
    selectedProductIds.clear();
    const form = document.getElementById("offerForm");
    form.reset();
    isEditing = false;
    currentEditId = null;
    updateUI();
    renderGrid();
}

async function fetchInventory() {
    try {
        const res = await authFetch("/api/products");
        const data = await res.json();
        allProducts = Array.isArray(data) ? data : (data.products || data.data || []);

        const catSelect = document.getElementById("categoryFilter");
        const uniqueCategories = [...new Set(allProducts.map(p => p.category?.name).filter(c => c && typeof c === 'string'))];

        catSelect.innerHTML = '<option value="all">All Categories</option>';
        uniqueCategories.sort().forEach(catName => {
            const option = document.createElement("option");
            option.value = catName;
            option.textContent = catName;
            catSelect.appendChild(option);
        });

        applyFilters();
    } catch (err) {
        console.error("Error fetching inventory:", err);
    }
}

function applyFilters() {
    const cat = document.getElementById("categoryFilter").value;
    const gen = document.getElementById("genderFilter").value;

    filteredProducts = allProducts.filter(p => {
        const pCat = p.category?.name ? String(p.category.name).trim() : "";
        const pGen = p.gender ? String(p.gender).trim() : "";
        return (cat === "all" || pCat.toLowerCase() === cat.toLowerCase()) &&
            (gen === "all" || pGen.toLowerCase() === gen.toLowerCase());
    });
    renderGrid();
}

function resolveProductImage(prod) {
    if (!prod) return "";
    if (Array.isArray(prod.image_urls) && prod.image_urls[0] && prod.image_urls[0] !== "null") return prod.image_urls[0];
    if (prod.image_url && typeof prod.image_url === "string" && prod.image_url !== "null") return prod.image_url;
    return "";
}

function renderGrid() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!filteredProducts.length) {
        grid.innerHTML = `<p class="loading-text">No products match your filters.</p>`;
        return;
    }

    filteredProducts.forEach(p => {
        const productId = p.id || p._id;
        const isAssigned = p.offer_id != null;
        const isDisabled = isAssigned && (!isEditing || p.offer_id !== currentEditId);

        const card = document.createElement("div");
        card.className = `inventory-card ${selectedProductIds.has(String(productId)) ? "selected" : ""} ${isDisabled ? "disabled" : ""}`;
        card.dataset.id = productId;

        const imgSrc = resolveProductImage(p);
        const productOffer = p.offer || p.offers || null;
        const offerPct = productOffer?.percentage ?? p.offer_percentage ?? 0;
        const badgeText = isDisabled ? `${productOffer?.name || "Offer"} (${offerPct}%)` : "";

        card.innerHTML = `
            ${isDisabled ? `<div class="active-offer-badge">${badgeText}</div>` : ""}
            ${imgSrc ? `<img src="${imgSrc}" class="inventory-img" alt="${p.name || ''}" />` : `<div class="inventory-img-placeholder">No Image</div>`}
            <p class="inventory-title">${p.name || 'Unnamed Product'}</p>
        `;

        if (!isDisabled) {
            card.onclick = () => toggleSelection(productId.toString(), card);
        }
        grid.appendChild(card);
    });
}

function toggleSelection(id, cardElement) {
    if (selectedProductIds.has(id)) {
        selectedProductIds.delete(id);
    } else {
        selectedProductIds.add(id);
    }
    cardElement.classList.toggle("selected");
    updateUI();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const startInput = document.getElementById("startDate").value;
    const endInput = document.getElementById("endDate").value;

    const payload = {
        name: document.getElementById("offerName").value,
        percentage: Number(document.getElementById("discountPercentage").value),
        startDate: startInput ? new Date(startInput).toISOString() : null,
        endDate: endInput ? new Date(endInput).toISOString() : null,
        productIds: Array.from(selectedProductIds)
    };

    const res = await authFetch(isEditing ? `/api/offers/${currentEditId}` : "/api/offers", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload)
    });

    if (!res.ok) return alert("Failed to save offer.");
    alert(isEditing ? "Offer Updated!" : "Offer Created!");
    resetForm();
    loadOffers();
    fetchInventory();
}

function setupEventListeners() {
    document.getElementById("offerForm").onsubmit = handleFormSubmit;
    document.getElementById("cancelEditBtn").onclick = resetForm;
    document.getElementById("categoryFilter").onchange = applyFilters;
    document.getElementById("genderFilter").onchange = applyFilters;

    document.getElementById("selectAllBtn").onclick = () => {
        filteredProducts.forEach(p => selectedProductIds.add(String(p.id || p._id)));
        renderGrid();
        updateUI();
    };

    document.getElementById("clearSelectionBtn").onclick = resetForm;

    let isDragging = false;
    const grid = document.getElementById("inventoryGrid");
    grid.onmousedown = () => isDragging = true;
    grid.onmouseover = (e) => {
        if (!isDragging) return;
        const card = e.target.closest('.inventory-card');
        if (card && !card.classList.contains('disabled')) {
            selectedProductIds.add(card.dataset.id);
            card.classList.add('selected');
            updateUI();
        }
    };
    window.onmouseup = () => isDragging = false;
}

function enterEditMode(camp) {
    isEditing = true;
    currentEditId = camp.id;
    document.getElementById("offerName").value = camp.name;
    document.getElementById("discountPercentage").value = camp.percentage;
    document.getElementById("startDate").value =
        camp.start_date
            ? new Date(camp.start_date).toISOString().slice(0, 16)
            : "";

    document.getElementById("endDate").value =
        camp.end_date
            ? new Date(camp.end_date).toISOString().slice(0, 16)
            : "";
    selectedProductIds = new Set((camp.product_ids || []).map(String));
    updateUI();
    renderGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadOffers() {
    try {
        const res = await authFetch("/api/offers");
        const data = await res.json();
        const offers = data.offers || (Array.isArray(data) ? data : []);
        const list = document.getElementById("activeOffersList");
        list.innerHTML = "";

        if (!offers.length) {
            list.innerHTML = `<p class="loading-text">No active or upcoming campaigns created.</p>`;
            return;
        }

        offers.forEach(camp => {
            const clone = document.getElementById("campaignItemTemplate").content.cloneNode(true);
            clone.querySelector(".campaign-title").textContent = `${camp.name} (${camp.percentage}% OFF)`;
            clone.querySelector(".campaign-count").textContent = `Linked: ${camp.productsList?.length || camp.product_ids?.length || 0} products`;

            const now = new Date();
            const startDate = camp.start_date ? new Date(camp.start_date) : null;
            const endDate = camp.end_date ? new Date(camp.end_date) : null;

            const formatDate = (date) =>
                date
                    ? date.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short"
                    })
                    : "Not Set";

            let status = "Upcoming";

            if (startDate && endDate) {
                if (now < startDate) status = "Upcoming";
                else if (now >= startDate && now <= endDate) status = "Active";
                else status = "Expired";
            } else if (!startDate && endDate) {
                status = now <= endDate ? "Active" : "Expired";
            } else {
                status = "Active";
            }

            const statusEl = clone.querySelector(".campaign-status");
            statusEl.textContent = status;
            statusEl.classList.remove("status-active", "status-upcoming", "status-expired");

            if (status === "Active") statusEl.classList.add("status-active");
            else if (status === "Upcoming") statusEl.classList.add("status-upcoming");
            else statusEl.classList.add("status-expired");

            clone.querySelector(".campaign-start").textContent = formatDate(startDate);
            clone.querySelector(".campaign-end").textContent = formatDate(endDate);

            clone.querySelector(".edit-campaign-btn").onclick = () => enterEditMode(camp);
            clone.querySelector(".delete-campaign-btn").onclick = async () => {
                if (confirm("End this offer?")) {
                    await authFetch(`/api/offers/${camp.id}`, { method: "DELETE" });
                    loadOffers(); 
                    fetchInventory();
                }
            };
            list.appendChild(clone);
        });
    } catch (err) {
        console.error("Error loading offers:", err);
    }
}