// public/js/login.js
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await apiPost("/auth/login", { email, password });
    saveToken(data.session.access_token);
    showMessage(msg, "Logged in! Redirecting…", "success");
    setTimeout(() => (window.location.href = "/index.html"), 600);
  } catch (err) {
    showMessage(msg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});
