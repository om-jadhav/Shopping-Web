// public/js/dashboard.js

const msg = document.getElementById("msg");
const logoutBtn = document.getElementById("logoutBtn");
const profileForm = document.getElementById("profileForm");

// Profile Completion Elements
const progressFill = document.getElementById("progressFill");
const completionPercent = document.getElementById("completionPercent");
const completionChecklist = document.getElementById("completionChecklist");


// ===============================
// PROFILE COMPLETION
// ===============================
function updateProfileCompletion(profile) {

  const fields = [
    {
      label: "Full Name",
      value: profile.full_name
    },
    {
      label: "Phone Number",
      value: profile.phone
    },
    {
      label: "Address Line 1",
      value: profile.address_line1
    },
    {
      label: "City",
      value: profile.city
    },
    {
      label: "State",
      value: profile.state
    },
    {
      label: "Postal Code",
      value: profile.postal_code
    },
    {
      label: "Country",
      value: profile.country
    }
  ];

  const completed = fields.filter(field =>
    field.value &&
    String(field.value).trim() !== ""
  ).length;

  const percent = Math.round((completed / fields.length) * 100);

  progressFill.style.width = percent + "%";
  completionPercent.textContent = percent + "%";

  completionChecklist.innerHTML = "";

  fields.forEach(field => {

    const row = document.createElement("div");
    row.className = "check-item";

    const icon = field.value && String(field.value).trim() !== ""
      ? "✅"
      : "❌";

    row.innerHTML = `
      <span>${icon}</span>
      <span>${field.label}</span>
    `;

    completionChecklist.appendChild(row);

  });

}

// ===============================
// LOAD PROFILE
// ===============================
function calculateProfileCompletion(profile) {
  const fields = [
    profile.full_name,
    profile.phone,
    profile.address_line1,
    profile.city,
    profile.state,
    profile.postal_code,
    profile.country
  ];

  const completed = fields.filter(f => f && String(f).trim() !== "").length;

  return Math.round((completed / fields.length) * 100);
}
async function loadProfile() {

  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {

    const data = await apiGet("/auth/me", token);

    const profile = data.profile || {};
    const completion = calculateProfileCompletion(profile);

    document.getElementById("profileProgress").style.width =
      completion + "%";

    document.getElementById("profilePercentage").textContent =
      completion + "% Complete";

    document.getElementById("fullName").value =
      profile.full_name ||
      data.user.user_metadata?.full_name ||
      "";

    document.getElementById("email").value =
      data.user.email || "";

    document.getElementById("phone").value =
      profile.phone || "";

    document.getElementById("address1").value =
      profile.address_line1 || "";

    document.getElementById("address2").value =
      profile.address_line2 || "";

    document.getElementById("city").value =
      profile.city || "";

    document.getElementById("state").value =
      profile.state || "";

    document.getElementById("postalCode").value =
      profile.postal_code || "";

    document.getElementById("country").value =
      profile.country || "";

    // NEW
    updateProfileCompletion(profile);

  } catch (err) {

    console.error(err);

    showMessage(
      msg,
      "Session expired. Please login again.",
      "error"
    );

    clearToken();

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);

  }

}

// ===============================
// SAVE PROFILE
// ===============================
profileForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const token = getToken();
  const phone = document.getElementById("phone").value.trim();
  const postalCode = document.getElementById("postalCode").value.trim();

  if (phone && !/^[0-9]{10}$/.test(phone)) {
    showMessage(msg, "Phone number must contain exactly 10 digits.", "error");
    return;
  }

  if (postalCode && !/^[0-9]{6}$/.test(postalCode)) {
    showMessage(msg, "Postal code must contain exactly 6 digits.", "error");
    return;
  }
  try {

    const payload = {

      full_name:
        document.getElementById("fullName").value,

      phone,

      address_line1:
        document.getElementById("address1").value,

      address_line2:
        document.getElementById("address2").value,

      city:
        document.getElementById("city").value,

      state:
        document.getElementById("state").value,

      postal_code: postalCode,

      country:
        document.getElementById("country").value

    };

    const res = await fetch("/api/profile", {

      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },

      body: JSON.stringify(payload)

    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Update failed");
    }

    showMessage(msg, "Profile updated successfully!", "success");

    loadProfile();

    // NEW
    updateProfileCompletion(payload);

  } catch (err) {

    console.error(err);

    showMessage(
      msg,
      err.message,
      "error"
    );

  }

});

// ===============================
// LOGOUT
// ===============================
logoutBtn.addEventListener("click", async () => {

  try {

    await apiPost(
      "/auth/logout",
      {},
      getToken()
    );

  } catch (_) { }

  clearToken();

  window.location.href = "/login.html";

});



// ===============================
loadProfile();