// public/js/login.js
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
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