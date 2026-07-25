// public/js/login.js
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const googleLoginBtn = document.getElementById("googleLoginBtn");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

// Safely initialize Supabase using backend config endpoint and catch OAuth tokens
let supabaseClient = null;

async function initSupabaseClient() {
  try {
    const res = await fetch("/api/config/supabase");
    const config = await res.json();
    
    if (config.url && config.anonKey) {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey);

      // --- CATCH GOOGLE OAUTH REDIRECT & SAVE TOKEN ---
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (session && session.access_token) {
        // Save it in the exact format your app uses for email/password login
        localStorage.setItem("token", session.access_token);
        
        // Optional: Redirect immediately to products if they just landed back from Google
        if (window.location.search.includes("code=") || window.location.hash.includes("access_token=")) {
          window.location.href = "/products.html";
        }
      }
    } else {
      console.error("Supabase config endpoint returned missing keys:", config);
    }
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

// Initialize immediately on load
initSupabaseClient();

// Handle Google Login Click
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    // If client isn't ready yet, wait briefly for initialization to finish
    if (!supabaseClient) {
      showMessage(msg, "Connecting to authentication service... Please try again in a second.", "error");
      await initSupabaseClient();
      if (!supabaseClient) return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/products.html`,
        },
      });
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const remember = rememberMeInput ? rememberMeInput.checked : true;

  try {
    const data = await apiPost("/auth/login", { email, password });
    saveToken(data.session.access_token, remember);

    const isAdmin = data.profile?.role === "admin";
    showMessage(msg, "Logged in! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = isAdmin ? "/admin.html" : "/products.html";
    }, 600);
  } catch (err) {
    showMessage(msg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});