// public/js/signup.js
const form = document.getElementById("signupForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await apiPost("/auth/signup", { email, password, fullName });

    // Always send the person to the login page rather than auto-logging
    // them in here — keeps the flow explicit: sign up, then log in.
    const message = data.session
      ? "Account created! Redirecting to login…"
      : data.message; // e.g. "check your email to confirm" when confirmation is required

    showMessage(msg, message, "success");
    setTimeout(() => (window.location.href = "/login.html"), 1200);
  } catch (err) {
    showMessage(msg, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});