// public/js/dashboard.js
const profileBox = document.getElementById("profileBox");
const msg = document.getElementById("msg");
const logoutBtn = document.getElementById("logoutBtn");

async function loadProfile() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const data = await apiGet("/auth/me", token);
    const email = data.user?.email || "—";
    const fullName = data.profile?.full_name || data.user?.user_metadata?.full_name || "—";

    profileBox.innerHTML = `
      <div class="profile-row"><span>Name</span><span>${fullName}</span></div>
      <div class="profile-row"><span>Email</span><span>${email}</span></div>
      <div class="profile-row"><span>User ID</span><span>${data.user.id}</span></div>
    `;
  } catch (err) {
    showMessage(msg, "Session expired. Please log in again.", "error");
    clearToken();
    setTimeout(() => (window.location.href = "/login.html"), 1200);
  }
}

logoutBtn.addEventListener("click", async () => {
  try {
    await apiPost("/auth/logout", {}, getToken());
  } catch (_) {
    // even if the API call fails, still clear local token
  }
  clearToken();
  window.location.href = "/login.html";
});

loadProfile();
