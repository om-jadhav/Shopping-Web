// public/js/nav.js
// Drop a <div id="navLinks" class="nav-links"></div> on any page,
// include this script after api.js, and it fills itself in based on
// whether the visitor is logged out, a customer, or an admin.

// public/js/nav.js
async function renderNav() {
  const container = document.getElementById("navLinks");
  if (!container) return;

  const token = getToken();
  const currentPath = window.location.pathname;

  const allLinks = (isAdmin) => [
    { href: "/products.html", label: "Shop" },
    ...(isAdmin ? [] : [{ href: "/customize.html", label: "Custom T-Shirt" }]),
    ...(isAdmin ? [] : [{ href: "/orders.html", label: "Orders" }]),
    { href: isAdmin ? "/admin.html" : "/index.html", label: isAdmin ? "Admin" : "My Account" },
    ...(isAdmin ? [] : [{ href: "/cart.html", label: "My Cart" }]),
  ];

  function renderLinks(links) {
  return links
    .map((link) => {
      const isActive = link.href === currentPath;

      return `
        <a 
          href="${link.href}" 
          class="${isActive ? "active" : ""}"
        >
          ${link.label}
        </a>
      `;
    })
    .join("");
}

  if (!token) {
    const guestLinks = [
      { href: "/products.html", label: "Shop" },
      { href: "/customize.html", label: "Custom T-Shirt" },
      { href: "/login.html", label: "Log in" },
      { href: "/signup.html", label: "Sign up" },
    ];
    container.innerHTML = renderLinks(guestLinks);
    return;
  }

  try {
    const data = await apiGet("/auth/me", token);
    const isAdmin = data.profile?.role === "admin";

    container.innerHTML =
      renderLinks(allLinks(isAdmin)) +
      `<a href="#" id="navLogout">Log out</a>`;

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
    const guestLinks = [
      { href: "/products.html", label: "Shop" },
      { href: "/customize.html", label: "Custom T-Shirt" },
      { href: "/login.html", label: "Log in" },
      { href: "/signup.html", label: "Sign up" },
    ];
    container.innerHTML = renderLinks(guestLinks);
  }
}

renderNav();