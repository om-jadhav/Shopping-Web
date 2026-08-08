// public/js/footer.js
// Drop a <div id="siteFooter"></div> near the end of <body> on any page,
// include this script, and it fills itself in — same pattern as nav.js.

function renderFooter() {
    const container = document.getElementById("siteFooter");
    if (!container) return;

    const year = new Date().getFullYear();

    // NOTE: Shop/Help/About sub-links point to pages that don't exist yet
    // (category-filtered shop views, FAQs, sustainability, etc). They're
    // wired to "#" placeholders so the layout matches the mockup without
    // shipping dead links to real URLs — swap the href in once each page
    // exists.
    container.innerHTML = `
    <div class="footer-inner">
      <div class="footer-col footer-brand">
        <div class="footer-logo"><img src="/assets/logo/0001.svg" alt="IDK." class="footer-logo-img"></div>
        <p class="footer-blurb">Bold thoughts. Printed loud. 100% you.</p>
      </div>

      <div class="footer-col">
        <h4>Shop</h4>
        <a href="/products.html">All Tees</a>
        <a href="#">Graphic Tees</a>
        <a href="#">Quotes</a>
        <a href="#">Artist Series</a>
        <a href="#">Minimal</a>
        <a href="#">New Arrivals</a>
      </div>

      <div class="footer-col">
        <h4>Help</h4>
        <a href="#">FAQs</a>
        <a href="#">Shipping &amp; Delivery</a>
        <a href="#">Returns</a>
        <a href="#">Size Guide</a>
        <a href="#">Contact Us</a>
      </div>

      <div class="footer-col">
        <h4>About</h4>
        <a href="#">Our Story</a>
        <a href="#">Sustainability</a>
        <a href="#">Careers</a>
        <a href="#">Bulk Orders</a>
      </div>

      <div class="footer-col footer-follow">
        <h4>Follow Us</h4>
        <div class="footer-socials">
          <a href="https://www.instagram.com/idk.clothingco?igsh=MTZieG8wcW56MnM1dg==" aria-label="Instagram" class="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4.2"/>
              <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="#" aria-label="X (Twitter)" class="social-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.8L4.5 22H1.4l8-9.2L1 2h7.1l4.9 6.2L18.9 2z"/>
            </svg>
          </a>
          <a href="#" aria-label="Facebook" class="social-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M13.5 21v-8.2h2.75l.41-3.2h-3.16V7.4c0-.93.26-1.56 1.59-1.56h1.7V2.98c-.29-.04-1.3-.13-2.47-.13-2.44 0-4.11 1.49-4.11 4.22v2.35H7.46v3.2h2.75V21h3.29z"/>
            </svg>
          </a>
        </div>
        <a href="https://www.instagram.com/idk.clothingco" class="footer-hashtag">#idkclothing</a>
      </div>

      <div class="footer-col footer-newsletter">
        <h4 class="newsletter-heading">Join the IDK. Fam.</h4>
        <p class="footer-blurb">Get updates, drops &amp; exclusive offers.</p>
        <form id="newsletterForm" class="newsletter-form">
          <input type="email" placeholder="Your email" required aria-label="Email address" />
          <button type="submit" aria-label="Subscribe">→</button>
        </form>
        <p id="newsletterMsg" class="newsletter-msg"></p>
      </div>
    </div>

    <div class="footer-bottom">
      <span>&copy; ${year} IDK Clothing Co. All rights reserved.</span>
    </div>
  `;

    // Front-end only for now — no signup endpoint exists yet, so this just
    // confirms visually. Wire this up to your mailing-list API/table later.
    const form = document.getElementById("newsletterForm");
    const msg = document.getElementById("newsletterMsg");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            msg.textContent = "Thanks — you're on the list!";
            form.reset();
        });
    }
}

renderFooter();