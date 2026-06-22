// public/js/nav.js
// Drop a <div id="navLinks" class="nav-links"></div> on any page,
// include this script after api.js, and it fills itself in based on
// whether the visitor is logged out, a customer, or an admin.

async function renderNav() {
  const container = document.getElementById("navLinks");
  if (!container) return;

  const token = getToken();

  if (!token) {
    container.innerHTML = `<a href="/login.html">Log in</a><a href="/signup.html">Sign up</a>`;
    return;
  }

  try {
    const data = await apiGet("/auth/me", token);
    const isAdmin = data.profile?.role === "admin";
    container.innerHTML = `
      <a href="${isAdmin ? "/admin.html" : "/index.html"}">${isAdmin ? "Admin" : "My Account"}</a>
      <a href="#" id="navLogout">Log out</a>
    `;
    document.getElementById("navLogout").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await apiPost("/auth/logout", {}, token);
      } catch (_) {}
      clearToken();
      window.location.reload();
    });
  } catch (err) {
    clearToken();
    container.innerHTML = `<a href="/login.html">Log in</a><a href="/signup.html">Sign up</a>`;
  }
}

renderNav();