// public/js/customize.js

const COLORS = [
  { name: "White", hex: "#f2f2f2" },
  { name: "Black", hex: "#1c1c1c" },
  { name: "Navy", hex: "#1b2a4a" },
  { name: "Red", hex: "#b23b3b" },
  { name: "Grey", hex: "#8a8a8a" },
  { name: "Forest Green", hex: "#2f4a34" },
  { name: "Mustard", hex: "#c9a227" },
  { name: "Sky Blue", hex: "#5b8fb0" },
  { name: "Maroon", hex: "#6b2632" },
  { name: "Charcoal", hex: "#333438" },
];

const CANVAS_W = 240;
const CANVAS_H = 300;
const MODAL_CANVAS_W = 480;
const MODAL_CANVAS_H = 600;

// Print zones as fractions of the DRAWN GARMENT BOX. Same set used for
// both front and back canvases - each side has its own independent
// placement selector, but the zone shapes themselves are shared.
const PLACEMENT_ZONES = {
  center: { x: 0.29, y: 0.25, w: 0.45, h: 0.40 },
  left:   { x: 0.25, y: 0.25, w: 0.45, h: 0.40 },
  right:  { x: 0.32, y: 0.25, w: 0.45, h: 0.40 },
};

const state = {
  colorHex: COLORS[0].hex,
  materialId: null,
  placement: "center",
  backPlacement: "center",
  frontDesignImage: null,
  backDesignImage: null,
  frontDesignFile: null,
  backDesignFile: null,
  breakdown: [{ gender: "male", size: "S", quantity: 1 }],
  description: "",
  profileComplete: false,
};

let frontBaseImg = null;
let backBaseImg = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Fits `img` inside a box, preserving aspect ratio (like object-fit: contain),
// centered within the box - so uploads never get stretched/distorted.
function containRect(img, box) {
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  return { x, y, w, h };
}

function zoneToPixels(zone, garmentBox) {
  return {
    x: garmentBox.offsetX + zone.x * garmentBox.drawW,
    y: garmentBox.offsetY + zone.y * garmentBox.drawH,
    w: zone.w * garmentBox.drawW,
    h: zone.h * garmentBox.drawH,
  };
}

// Draws baseImg tinted with colorHex, then designImg (aspect-preserved,
// clipped to baseImg's silhouette) at the given zone. canvasW/canvasH let
// the same function drive both the small side-by-side canvases and the
// bigger modal preview.
function renderShirt(ctx, baseImg, designImg, zone, colorHex, canvasW, canvasH) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  if (!baseImg) return;

  const scale = Math.min(canvasW / baseImg.width, canvasH / baseImg.height) * 0.95;
  const drawW = baseImg.width * scale;
  const drawH = baseImg.height * scale;
  const offsetX = (canvasW - drawW) / 2;
  const offsetY = (canvasH - drawH) / 2;
  const garmentBox = { offsetX, offsetY, drawW, drawH };

  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(baseImg, offsetX, offsetY, drawW, drawH);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = colorHex;
  ctx.fillRect(offsetX, offsetY, drawW, drawH);

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(baseImg, offsetX, offsetY, drawW, drawH);

  ctx.globalCompositeOperation = "source-over";

  if (designImg) {
    const off = document.createElement("canvas");
    off.width = canvasW;
    off.height = canvasH;
    const offCtx = off.getContext("2d");

    const zonePx = zoneToPixels(zone, garmentBox);
    const fitted = containRect(designImg, zonePx);
    offCtx.drawImage(designImg, fitted.x, fitted.y, fitted.w, fitted.h);

    offCtx.globalCompositeOperation = "destination-in";
    offCtx.drawImage(baseImg, offsetX, offsetY, drawW, drawH);

    ctx.drawImage(off, 0, 0);
  }
}

function draw() {
  const frontCtx = document.getElementById("frontCanvas").getContext("2d");
  const backCtx = document.getElementById("backCanvas").getContext("2d");

  renderShirt(frontCtx, frontBaseImg, state.frontDesignImage, PLACEMENT_ZONES[state.placement], state.colorHex, CANVAS_W, CANVAS_H);
  renderShirt(backCtx, backBaseImg, state.backDesignImage, PLACEMENT_ZONES[state.backPlacement], state.colorHex, CANVAS_W, CANVAS_H);

  updateBackdrop();
}

// ---- Dynamic backdrop: dark shirts get a light backdrop and vice versa,
// so the shirt never visually merges into the page/canvas background ----
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function updateBackdrop() {
  const isDark = relativeLuminance(state.colorHex) < 0.45;
  document.querySelectorAll(".canvas-box, .modal-canvas-wrap").forEach((el) => {
    el.classList.toggle("backdrop-light", isDark);
    el.classList.toggle("backdrop-dark", !isDark);
  });
}

function updateProceedState() {
  const proceedBtn = document.getElementById("proceedBtn");
  const hasDesign = state.frontDesignImage || state.backDesignImage;
  const hasMaterial = !!state.materialId;
  const hasQty = state.breakdown.some((row) => row.quantity > 0);
  proceedBtn.disabled = !(hasDesign && hasMaterial && hasQty && state.profileComplete);
}

const REQUIRED_PROFILE_FIELDS = ["full_name", "phone", "address_line1", "city", "state", "postal_code", "country"];

// Checks the customer's profile up front - before they invest time
// designing - rather than only finding out after they hit Continue.
async function checkProfileComplete() {
  const token = getToken();
  if (!token) {
    // Not logged in yet - don't block design browsing, submit will redirect
    // to login, and they can come back once their profile is set up.
    state.profileComplete = true;
    return;
  }

  try {
    const data = await apiGet("/auth/me", token);
    const profile = data.profile || {};
    const isComplete = REQUIRED_PROFILE_FIELDS.every((field) => String(profile[field] || "").trim());
    state.profileComplete = isComplete;

    const banner = document.getElementById("profileWarningBanner");
    banner.style.display = isComplete ? "none" : "block";
  } catch (err) {
    // If we can't verify, don't silently allow submission past the backend
    // check anyway - but don't hard-block browsing either.
    state.profileComplete = true;
  }
  updateProceedState();
}

// ---- Uploads (restricted to PNG/JPEG only, matching the backend) ----
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

function wireUpload(inputId, noteId, imgKey, fileKey, removeBtnId) {
  const input = document.getElementById(inputId);
  const note = document.getElementById(noteId);
  const removeBtn = document.getElementById(removeBtnId);

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      note.textContent = "Only PNG or JPEG images are allowed.";
      note.classList.add("error-note");
      e.target.value = "";
      return;
    }
    note.classList.remove("error-note");

    state[fileKey] = file;
    removeBtn.style.display = "inline-block";

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state[imgKey] = img;
        note.textContent = `Uploaded: ${file.name}`;
        updateProceedState();
        draw();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", () => {
    state[imgKey] = null;
    state[fileKey] = null;
    input.value = "";
    note.textContent = "No image uploaded.";
    note.classList.remove("error-note");
    removeBtn.style.display = "none";
    updateProceedState();
    draw();
  });
}

// ---- Color swatches ----
function renderColorSwatches() {
  const container = document.getElementById("colorSwatches");
  container.innerHTML = COLORS.map((c, i) => `
    <span class="color-swatch ${i === 0 ? "selected" : ""}"
          style="background:${c.hex}" data-hex="${c.hex}" title="${c.name}"></span>
  `).join("");

  container.querySelectorAll(".color-swatch").forEach((el) => {
    el.addEventListener("click", () => {
      container.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      el.classList.add("selected");
      state.colorHex = el.dataset.hex;
      draw();
    });
  });
}

// ---- Placement swatches (front and back, independent) ----
function wirePlacementSwatches(containerId, stateKey) {
  document.querySelectorAll(`#${containerId} .swatch`).forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(`#${containerId} .swatch`).forEach((s) => s.classList.remove("selected"));
      el.classList.add("selected");
      state[stateKey] = el.dataset.placement;
      draw();
    });
  });
}

// ---- Materials ----
async function loadMaterials() {
  const select = document.getElementById("materialSelect");
  try {
    const data = await apiGet("/materials");
    const materials = data.materials || [];

    if (!materials.length) {
      select.innerHTML = `<option value="">No materials available</option>`;
      return;
    }

    select.innerHTML = materials.map((m) => `
      <option value="${m.id}" ${m.stock_quantity === 0 ? "disabled" : ""}>
        ${m.name}${m.stock_quantity === 0 ? " (out of stock)" : ""}
      </option>
    `).join("");

    const firstInStock = materials.find((m) => m.stock_quantity > 0);
    if (firstInStock) {
      select.value = firstInStock.id;
      state.materialId = firstInStock.id;
    }
    updateProceedState();
  } catch (err) {
    select.innerHTML = `<option value="">Could not load materials</option>`;
  }

  select.addEventListener("change", () => {
    state.materialId = select.value || null;
    updateProceedState();
  });
}

// ---- Quantity breakdown rows ----
function renderBreakdownRows() {
  const container = document.getElementById("breakdownRows");
  container.innerHTML = state.breakdown.map((row, idx) => `
    <div class="breakdown-row" data-idx="${idx}">
      <select class="gender-select">
        <option value="male" ${row.gender === "male" ? "selected" : ""}>Male</option>
        <option value="female" ${row.gender === "female" ? "selected" : ""}>Female</option>
        <option value="unisex" ${row.gender === "unisex" ? "selected" : ""}>Unisex</option>
      </select>
      <select class="size-select">
        <option value="S" ${row.size === "S" ? "selected" : ""}>S</option>
        <option value="M" ${row.size === "M" ? "selected" : ""}>M</option>
        <option value="L" ${row.size === "L" ? "selected" : ""}>L</option>
      </select>
      <input type="number" class="qty-input" min="1" value="${row.quantity}" />
      ${state.breakdown.length > 1 ? `<button type="button" class="remove-row-btn">&times;</button>` : ""}
    </div>
  `).join("");

  container.querySelectorAll(".breakdown-row").forEach((rowEl) => {
    const idx = Number(rowEl.dataset.idx);

    rowEl.querySelector(".gender-select").addEventListener("change", (e) => {
      state.breakdown[idx].gender = e.target.value;
    });
    rowEl.querySelector(".size-select").addEventListener("change", (e) => {
      state.breakdown[idx].size = e.target.value;
    });
    rowEl.querySelector(".qty-input").addEventListener("change", (e) => {
      state.breakdown[idx].quantity = Math.max(1, Number(e.target.value) || 1);
      e.target.value = state.breakdown[idx].quantity;
      updateTotalNote();
      updateProceedState();
    });
    const removeBtn = rowEl.querySelector(".remove-row-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        state.breakdown.splice(idx, 1);
        renderBreakdownRows();
        updateTotalNote();
        updateProceedState();
      });
    }
  });

  updateTotalNote();
}

function updateTotalNote() {
  const total = state.breakdown.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  document.getElementById("totalQtyNote").textContent = `Total: ${total} shirt${total === 1 ? "" : "s"}`;
}

document.getElementById("addRowBtn").addEventListener("click", () => {
  state.breakdown.push({ gender: "male", size: "S", quantity: 1 });
  renderBreakdownRows();
  updateProceedState();
});

// ---- Description ----
document.getElementById("descriptionInput").addEventListener("input", (e) => {
  state.description = e.target.value;
});

// ---- Bigger preview modal ----
function openPreviewModal(side) {
  const modal = document.getElementById("previewModal");
  const modalCanvas = document.getElementById("modalCanvas");
  const modalLabel = document.getElementById("modalLabel");
  modalCanvas.width = MODAL_CANVAS_W;
  modalCanvas.height = MODAL_CANVAS_H;
  const ctx = modalCanvas.getContext("2d");

  if (side === "front") {
    modalLabel.textContent = "Front";
    renderShirt(ctx, frontBaseImg, state.frontDesignImage, PLACEMENT_ZONES[state.placement], state.colorHex, MODAL_CANVAS_W, MODAL_CANVAS_H);
  } else {
    modalLabel.textContent = "Back";
    renderShirt(ctx, backBaseImg, state.backDesignImage, PLACEMENT_ZONES[state.backPlacement], state.colorHex, MODAL_CANVAS_W, MODAL_CANVAS_H);
  }

  updateBackdrop();
  modal.classList.add("open");
}

function wirePreviewModal() {
  document.getElementById("frontCanvas").addEventListener("click", () => openPreviewModal("front"));
  document.getElementById("backCanvas").addEventListener("click", () => openPreviewModal("back"));
  document.getElementById("modalCloseBtn").addEventListener("click", closePreviewModal);
  document.getElementById("previewModal").addEventListener("click", (e) => {
    if (e.target.id === "previewModal") closePreviewModal();
  });
}

function closePreviewModal() {
  document.getElementById("previewModal").classList.remove("open");
}

// ---- Flatten a canvas onto a white background and return a Blob ----
function canvasToPreviewBlob(canvas) {
  return new Promise((resolve) => {
    const flat = document.createElement("canvas");
    flat.width = canvas.width;
    flat.height = canvas.height;
    const fctx = flat.getContext("2d");
    fctx.fillStyle = "#ffffff";
    fctx.fillRect(0, 0, flat.width, flat.height);
    fctx.drawImage(canvas, 0, 0);
    flat.toBlob((blob) => resolve(blob), "image/png", 0.9);
  });
}

// ---- Submit ----
document.getElementById("proceedBtn").addEventListener("click", async () => {
  const customizeMsg = document.getElementById("customizeMsg");
  const proceedBtn = document.getElementById("proceedBtn");

  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  proceedBtn.disabled = true;
  customizeMsg.style.display = "block";
  customizeMsg.className = "message";
  customizeMsg.textContent = "Submitting your order…";

  try {
    const formData = new FormData();
    formData.append("color", state.colorHex);
    formData.append("materialId", state.materialId);
    formData.append("placement", state.placement);
    formData.append("backPlacement", state.backPlacement);
    formData.append("description", state.description || "");
    formData.append("sizeBreakdown", JSON.stringify(state.breakdown));

    if (state.frontDesignFile) formData.append("frontDesign", state.frontDesignFile);
    if (state.backDesignFile) formData.append("backDesign", state.backDesignFile);

    const frontPreviewBlob = await canvasToPreviewBlob(document.getElementById("frontCanvas"));
    const backPreviewBlob = await canvasToPreviewBlob(document.getElementById("backCanvas"));
    if (frontPreviewBlob) formData.append("frontPreview", frontPreviewBlob, "front-preview.png");
    if (backPreviewBlob) formData.append("backPreview", backPreviewBlob, "back-preview.png");

    const res = await fetch("/api/custom-orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not submit order.");

    customizeMsg.className = "message success";
    customizeMsg.textContent = "Order placed! You can track its status from Orders.";
    setTimeout(() => { window.location.href = "/orders.html"; }, 1500);
  } catch (err) {
    customizeMsg.className = "message error";
    customizeMsg.textContent = err.message;
    proceedBtn.disabled = false;
  }
});

// ---- Init ----
async function init() {
  wireUpload("frontUpload", "frontUploadNote", "frontDesignImage", "frontDesignFile", "frontRemoveBtn");
  wireUpload("backUpload", "backUploadNote", "backDesignImage", "backDesignFile", "backRemoveBtn");
  wirePlacementSwatches("placementSwatches", "placement");
  wirePlacementSwatches("backPlacementSwatches", "backPlacement");
  wirePreviewModal();
  renderColorSwatches();
  renderBreakdownRows();
  loadMaterials();
  checkProfileComplete();

  try {
    [frontBaseImg, backBaseImg] = await Promise.all([
      loadImage("/images/tshirt-front.png"),
      loadImage("/images/tshirt-back.png"),
    ]);
    draw();
  } catch (err) {
    console.error("Could not load shirt mockup images", err);
  }
}

init();