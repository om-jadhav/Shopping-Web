// public/js/footer.js
// Drop a <div id="siteFooter"></div> near the end of <body> on any page,
// include this script, and it fills itself in — same pattern as nav.js.

function renderFooter() {
    const container = document.getElementById("siteFooter");
    if (!container) return;

    const year = new Date().getFullYear();

    container.innerHTML = `
    <div class="footer-inner">
      <div class="footer-col footer-brand">
        <div class="footer-logo">IDK<span class="brand-accent">Clothing</span></div>
        <p class="footer-blurb">
          Custom anime-inspired shirts, made your way. Design your fit, wear your favorites.
        </p>
      </div>

      <div class="footer-col">
        <h4>Quick Links</h4>
        <a href="/products.html">Shop</a>
        <a href="/cart.html">My Cart</a>
        <a href="/login.html">Log in</a>
        <a href="/signup.html">Sign up</a>
      </div>

      <div class="footer-col">
        <h4>Follow Us</h4>
       <div class="footer-socials">
  <a href="https://www.instagram.com/idk.clothingco?igsh=MTZieG8wcW56MnM1dg==" aria-label="Instagram" class="social-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4.2"/>
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/>
    </svg>
  </a>
  <a href="#" aria-label="X (Twitter)" class="social-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">
      <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.8L4.5 22H1.4l8-9.2L1 2h7.1l4.9 6.2L18.9 2z"/>
    </svg>
  </a>
  <a href="#" aria-label="Facebook" class="social-icon">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="display:block;margin:auto;">
      <path d="M13.5 21v-8.2h2.75l.41-3.2h-3.16V7.4c0-.93.26-1.56 1.59-1.56h1.7V2.98c-.29-.04-1.3-.13-2.47-.13-2.44 0-4.11 1.49-4.11 4.22v2.35H7.46v3.2h2.75V21h3.29z"/>
    </svg>
  </a>
</div>
      </div>
    </div>

    <div class="footer-bottom">
      <span>&copy; ${year} IDKClothing. All rights reserved.</span>
    </div>
  `;
}

renderFooter();