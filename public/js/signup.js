// public/js/signup.js
const form = document.getElementById("signupForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const googleLoginBtn = document.getElementById("googleLoginBtn");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Auth service unavailable.");

      const { data, error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/products.html` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

function validatePasswordPolicy(password) {
  if (!password || password.length < 10) return "Password must be at least 10 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter (A-Z).";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter (a-z).";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number (0-9).";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Password must contain at least one special character (e.g., !@#$%^&*).";
  return null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullNameInput = document.getElementById("fullName");
  const fullName = fullNameInput ? fullNameInput.value.trim() : "";
  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;

  const passwordError = validatePasswordPolicy(password);
  if (passwordError) {
    showMessage(msg, passwordError, "error");
    return;
  }

  submitBtn.disabled = true;

  try {
    const data = await apiPost("/auth/signup", { email, password, fullName });
    if (data.session?.access_token) saveToken(data.session.access_token);

    showMessage(msg, data.message || "Account created successfully! Please log in.", "success");
    setTimeout(() => { window.location.href = "/login.html"; }, 1500);
  } catch (err) {
    showMessage(msg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});