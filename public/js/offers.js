let selectedProductIds = new Set();
let allProducts = [];
let filteredProducts = [];

// lightweight debounce/cache to avoid re-rendering identical offers repeatedly
let lastActiveOffersHash = "";
let offerThumbnailObserver = null;

function getOfferThumbnailObserver() {
    if (offerThumbnailObserver) return offerThumbnailObserver;
    offerThumbnailObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
                img.src = src;
                img.removeAttribute("data-src");
            }
            offerThumbnailObserver.unobserve(img);
        });
    }, { root: null, rootMargin: "200px 0px", threshold: 0.05 });
    return offerThumbnailObserver;
}

document.addEventListener("DOMContentLoaded", async () => {
    await fetchAndRenderInventory();
    await loadActiveOffers();
    setupFilters();
    setupSelectionControls();
    setupContextMenu();
    setupDragSelection();
    setupFormSubmit();

    const POLL_MS = 60_000;
    setInterval(async () => {
        await fetchAndRenderInventory();
        await loadActiveOffers();
    }, POLL_MS);
});

// 🌟 STRIPPED DOWN HELPER: Just gives you the direct database string
function resolveProductImage(prod) {
    if (!prod) return "";

    // 1. Check if the database provides a valid array inside `image_urls`
    if (Array.isArray(prod.image_urls) && prod.image_urls.length > 0) {
        if (typeof prod.image_urls[0] === "string" && prod.image_urls[0].trim() !== "") {
            return prod.image_urls[0].trim();
        }
    }

    // 2. Backup check for a single string key
    if (prod.image_url && typeof prod.image_url === "string" && prod.image_url.trim() !== "") {
        return prod.image_url.trim();
    }

    // 3. Return an empty string to let the browser show its natural broken/empty image layout
    return "";
}

// 1. FETCH LIVE INVENTORY & PRE-FILTER UTILITIES
async function fetchAndRenderInventory() {
    const grid = document.getElementById("inventoryGrid");
    try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch inventory.");

        const responseData = await res.json();
        allProducts = Array.isArray(responseData) ? responseData : (responseData.data || responseData.products || []);

        populateCategoryDropdown();
        applyFiltersAndRender();

    } catch (err) {
        console.error("Error loading inventory:", err);
        grid.innerHTML = `<p class="loading-text" style="color: red;">Error pulling inventory data: ${err.message}</p>`;
    }
}

function populateCategoryDropdown() {
    const catSelect = document.getElementById("categoryFilter");
    const uniqueCategories = new Set();

    allProducts.forEach(p => {
        let cat = "";
        if (p.category) {
            cat = typeof p.category === 'object' ? (p.category.name || p.category.title || "") : p.category;
        } else if (p.categories?.name) {
            cat = p.categories.name;
        }
        if (cat) {
            uniqueCategories.add(String(cat).trim());
        }
    });

    catSelect.innerHTML = '<option value="all">All Categories</option>';
    uniqueCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.toLowerCase();
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
}

function setupFilters() {
    document.getElementById("categoryFilter").addEventListener("change", applyFiltersAndRender);
    document.getElementById("genderFilter").addEventListener("change", applyFiltersAndRender);
}

// 2. RENDERING PIPELINE WITH LIVE RUNTIME FILTER VIEWS
function applyFiltersAndRender() {
    const grid = document.getElementById("inventoryGrid");
    const targetCat = document.getElementById("categoryFilter").value;
    const targetGender = document.getElementById("genderFilter").value;

    filteredProducts = allProducts.filter(product => {
        let rawCat = "";
        if (product.category) {
            rawCat = typeof product.category === 'object' ? (product.category.name || product.category.title || "") : product.category;
        } else if (product.categories?.name) {
            rawCat = product.categories.name;
        }
        const pCat = String(rawCat).toLowerCase().trim();
        const pGender = String(product.gender || "").toLowerCase().trim();

        const matchCat = (targetCat === "all" || pCat === targetCat);
        const matchGender = (targetGender === "all" || pGender === targetGender);

        return matchCat && matchGender;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = `<p class="loading-text">No active assets match the criteria selected.</p>`;
        return;
    }

    grid.innerHTML = "";

    filteredProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "inventory-card";
        if (selectedProductIds.has(product.id.toString())) {
            card.classList.add("selected");
        }
        card.dataset.id = product.id;

        const hasOffer = product.offer_percentage || product.discount_price;
        const offerBadge = hasOffer ? `<span class="active-offer-badge" style="position: absolute; top: 5px; right: 5px; background: #2ecc71; color: white; padding: 2px 6px; font-size: 0.75rem; border-radius: 4px; font-weight: bold; z-index: 2;">${product.offer_percentage || 0}% OFF Active</span>` : "";

        let resolvedImgSrc = resolveProductImage(product);

        card.innerHTML = `
            ${offerBadge}
            <img src="${resolvedImgSrc}" alt="${product.name || 'Product'}" class="inventory-img" draggable="false" />
            <div class="inventory-info">
                <div class="inventory-title">${product.name || 'Unnamed Item'}</div>
                <div class="inventory-price">$${product.price || '0.00'}</div>
            </div>
        `;

        const productImg = card.querySelector("img.inventory-img");
        if (productImg) {
            productImg.loading = "lazy";
            productImg.decoding = "async";
            productImg.width = 200;
            productImg.height = 200;
        }

        card.addEventListener("click", (e) => {
            if (card.hasAttribute("data-dragged")) {
                card.removeAttribute("data-dragged");
                return;
            }
            toggleProductSelection(product.id.toString(), card);
        });

        grid.appendChild(card);
    });
}

function toggleProductSelection(id, element) {
    const strId = id.toString();
    if (selectedProductIds.has(strId)) {
        selectedProductIds.delete(strId);
        element.classList.remove("selected");
    } else {
        selectedProductIds.add(strId);
        element.classList.add("selected");
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    document.getElementById("selectionCount").textContent = `${selectedProductIds.size} products selected`;
}

function setupSelectionControls() {
    document.getElementById("selectAllBtn").addEventListener("click", () => {
        filteredProducts.forEach(p => {
            selectedProductIds.add(p.id.toString());
            const el = document.querySelector(`.inventory-card[data-id="${p.id}"]`);
            if (el) el.classList.add("selected");
        });
        updateSelectionUI();
    });

    document.getElementById("clearSelectionBtn").addEventListener("click", () => {
        selectedProductIds.clear();
        document.querySelectorAll(".inventory-card").forEach(el => el.classList.remove("selected"));
        updateSelectionUI();
    });
}

function setupDragSelection() {
    const grid = document.getElementById("inventoryGrid");
    const wrapper = document.getElementById("dragSelectWrapper");

    let dragBox = document.createElement("div");
    dragBox.className = "drag-selection-box";
    wrapper.appendChild(dragBox);

    let isDragging = false;
    let startX = 0, startY = 0;

    grid.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || e.target.closest("select") || e.target.closest("button")) return;

        isDragging = true;
        const rect = wrapper.getBoundingClientRect();

        startX = e.clientX - rect.left + wrapper.scrollLeft;
        startY = e.clientY - rect.top + wrapper.scrollTop;

        dragBox.style.left = `${startX}px`;
        dragBox.style.top = `${startY}px`;
        dragBox.style.width = "0px";
        dragBox.style.height = "0px";
        dragBox.style.display = "block";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const rect = wrapper.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(e.clientX - rect.left + wrapper.scrollLeft, rect.width));
        const currentY = Math.max(0, Math.min(e.clientY - rect.top + wrapper.scrollTop, rect.height));

        const boxLeft = Math.min(startX, currentX);
        const boxTop = Math.min(startY, currentY);
        const boxWidth = Math.abs(startX - currentX);
        const boxHeight = Math.abs(startY - currentY);

        dragBox.style.left = `${boxLeft}px`;
        dragBox.style.top = `${boxTop}px`;
        dragBox.style.width = `${boxWidth}px`;
        dragBox.style.height = `${boxHeight}px`;

        const boxBounds = dragBox.getBoundingClientRect();

        document.querySelectorAll(".inventory-card").forEach(card => {
            const cardBounds = card.getBoundingClientRect();
            const overlap = !(
                boxBounds.right < cardBounds.left ||
                boxBounds.left > cardBounds.right ||
                boxBounds.bottom < cardBounds.top ||
                boxBounds.top > cardBounds.bottom
            );

            if (overlap && boxWidth > 5 && boxHeight > 5) {
                card.setAttribute("data-dragged", "true");
                if (!selectedProductIds.has(card.dataset.id)) {
                    selectedProductIds.add(card.dataset.id);
                    card.classList.add("selected");
                }
            }
        });
        updateSelectionUI();
    });

    window.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        dragBox.style.display = "none";
    });
}

function setupContextMenu() {
    const menu = document.getElementById("customContextMenu");
    let rightClickedProductId = null;

    document.getElementById("inventoryGrid").addEventListener("contextmenu", (e) => {
        const card = e.target.closest(".inventory-card");
        if (!card) return;

        e.preventDefault();
        rightClickedProductId = card.dataset.id;

        menu.style.top = `${e.pageY}px`;
        menu.style.left = `${e.pageX}px`;
        menu.style.display = "block";
    });

    document.addEventListener("click", () => menu.style.display = "none");

    document.getElementById("ctxSelectOnly").addEventListener("click", () => {
        selectedProductIds.clear();
        document.querySelectorAll(".inventory-card").forEach(el => el.classList.remove("selected"));

        selectedProductIds.add(rightClickedProductId.toString());
        const targetCard = document.querySelector(`.inventory-card[data-id="${rightClickedProductId}"]`);
        if (targetCard) targetCard.classList.add("selected");
        updateSelectionUI();
    });

    document.getElementById("ctxSelectAll").addEventListener("click", () => {
        document.getElementById("selectAllBtn").click();
    });

    document.getElementById("ctxDeselectAll").addEventListener("click", () => {
        document.getElementById("clearSelectionBtn").click();
    });
}

function setupFormSubmit() {
    const form = document.getElementById("offerForm");
    const msg = document.getElementById("offerFormMsg");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (selectedProductIds.size === 0) {
            msg.className = "message error";
            msg.textContent = "Please select at least one product to apply this offer to.";
            return;
        }

        const endDateInput = document.getElementById("endDate").value;

        const payload = {
            name: document.getElementById("offerName").value,
            percentage: parseInt(document.getElementById("discountPercentage").value),
            startDate: document.getElementById("startDate").value || null,
            endDate: endDateInput ? new Date(endDateInput).toISOString() : null,
            productIds: Array.from(selectedProductIds)
        };

        try {
            const token = localStorage.getItem("sb_access_token") || localStorage.getItem("token");

            const res = await fetch("/api/offers", {
                method: "POST",
                headers: {
                    "Authorization": token ? `Bearer ${token}` : "",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create offer.");

            msg.className = "message success";
            msg.textContent = "Offer created and applied successfully!";
            form.reset();
            selectedProductIds.clear();
            updateSelectionUI();

            await fetchAndRenderInventory();
            await loadActiveOffers();

        } catch (err) {
            msg.className = "message error";
            msg.textContent = err.message;
        }
    });
}

// 🚀 7. RENDER ACTIVE OFFERS VIA STRUCTURAL TEMPLATE CLONING
async function loadActiveOffers() {
    const listContainer = document.getElementById("activeOffersList");
    if (!listContainer) return;

    try {
        const token = localStorage.getItem("sb_access_token") || localStorage.getItem("token");

        const res = await fetch("/api/offers", {
            method: "GET",
            headers: {
                "Authorization": token ? `Bearer ${token}` : "",
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Failed to load active campaigns.");

        const data = await res.json();
        const campaigns = data.offers || [];

        // cheap snapshot to avoid re-rendering (prevents images re-requesting on each poll)
        const snapshot = JSON.stringify(campaigns.map(c => ({
            id: c.id,
            product_ids: Array.isArray(c.product_ids) ? c.product_ids : [],
            updated_at: c.updated_at || c.updatedAt || c.created_at || null
        })));
        if (snapshot === lastActiveOffersHash) return; // nothing changed
        lastActiveOffersHash = snapshot;

        listContainer.innerHTML = "";

        if (campaigns.length === 0) {
            listContainer.innerHTML = `<p style="color: #888; font-style: italic; margin: 0;">No active offer campaigns currently saved in the system.</p>`;
            return;
        }

        const itemTemplate = document.getElementById("campaignItemTemplate");
        const thumbTemplate = document.getElementById("productThumbnailTemplate");

        campaigns.forEach(camp => {
            const clone = itemTemplate.content.cloneNode(true);

            clone.querySelector(".campaign-title").textContent = `${camp.name} (${camp.percentage}% OFF)`;
            clone.querySelector(".campaign-date").textContent = formatOfferDate(camp.end_date);

            const itemsCount = Array.isArray(camp.product_ids) ? camp.product_ids.length : 0;
            clone.querySelector(".campaign-count").textContent = itemsCount;

            const thumbContainer = clone.querySelector(".campaign-products-inline");
            const linkedProducts = Array.isArray(camp.productsList) ? camp.productsList : [];

            if (linkedProducts.length === 0) {
                thumbContainer.innerHTML = '<span style="color:#aaa; font-size:0.8rem; font-style:italic;">No products remaining</span>';
            } else {
                linkedProducts.forEach(prod => {
                    const fullProduct = allProducts.find(p => p.id === prod.id);
                    let thumbSrc = resolveProductImage(fullProduct || prod) || "";

                    const thumbClone = thumbTemplate.content.cloneNode(true);
                    const wrapperEl = thumbClone.querySelector(".campaign-thumb-wrapper");
                    if (wrapperEl) wrapperEl.setAttribute("title", prod.name || "Product");

                    const imgEl = thumbClone.querySelector(".thumb-img");
                    if (imgEl) {
                        // defer actual loading until the thumbnail is near viewport
                        imgEl.alt = prod.name || "Product";
                        imgEl.loading = "lazy";
                        imgEl.decoding = "async";
                        imgEl.width = 50;
                        imgEl.height = 50;

                        if (thumbSrc) {
                            imgEl.src = thumbSrc;
                        } else {
                            imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                        }
                    }

                    const singleCancelBtn = thumbClone.querySelector(".remove-single-product-btn");
                    if (singleCancelBtn) {
                        singleCancelBtn.dataset.campaignId = camp.id;
                        singleCancelBtn.dataset.productId = prod.id;

                        singleCancelBtn.addEventListener("click", async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Remove "${prod.name || 'this item'}" from the discount campaign?`)) return;
                            await removeSingleProductFromCampaign(camp.id, prod.id);
                            // optimistic UI update: remove thumbnail immediately
                            singleCancelBtn.closest(".campaign-thumb-wrapper")?.remove();
                        });
                    }

                    thumbContainer.appendChild(thumbClone);
                });
            }

            const masterDeleteBtn = clone.querySelector(".delete-campaign-btn");
            if (masterDeleteBtn) {
                masterDeleteBtn.dataset.id = camp.id;
                masterDeleteBtn.addEventListener("click", async (e) => {
                    if (!confirm("Are you sure you want to completely end this offer campaign?")) return;
                    await deleteCampaign(camp.id);
                });
            }

            listContainer.appendChild(clone);
        });

    } catch (err) {
        listContainer.innerHTML = `<p style="color: red; margin: 0;">Error loading campaigns: ${err.message}</p>`;
    }
}

async function removeSingleProductFromCampaign(campaignId, productId) {
    try {
        const token = localStorage.getItem("sb_access_token") || localStorage.getItem("token");

        const res = await fetch(`/api/offers/${campaignId}/products/${productId}`, {
            method: "DELETE",
            headers: {
                "Authorization": token ? `Bearer ${token}` : "",
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to slice product out of target campaign row.");

        await loadActiveOffers();
        await fetchAndRenderInventory();
    } catch (err) {
        alert("Error removing item from campaign: " + err.message);
    }
}

async function deleteCampaign(id) {
    try {
        const token = localStorage.getItem("sb_access_token") || localStorage.getItem("token");

        const res = await fetch(`/api/offers/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": token ? `Bearer ${token}` : "",
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to terminate campaign target row.");

        await loadActiveOffers();
        await fetchAndRenderInventory();
    } catch (err) {
        alert("Error terminating campaign: " + err.message);
    }
}

function formatOfferDate(value) {
    if (!value) return "No expiration date";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(new Date(value));
}