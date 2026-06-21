// controllers/authController.js
// "Controller" layer: receives req/res, validates input, talks to
// Supabase + Models, sends back JSON. No direct DB queries here.

const { supabase } = require("../config/supabaseClient");
const profileModel = require("../models/profileModel");

// POST /api/auth/signup
async function signup(req, res) {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || "" }, // saved to auth.users metadata
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Note: if "Confirm email" is enabled in Supabase Auth settings,
  // data.session will be null until the user clicks the email link.
  return res.status(201).json({
    message: data.session
      ? "Signup successful."
      : "Signup successful. Please check your email to confirm your account.",
    user: data.user,
    session: data.session,
  });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Login successful.",
    user: data.user,
    session: data.session, // contains access_token the frontend should store
  });
}

// POST /api/auth/logout
async function logout(req, res) {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({ message: "Logged out." });
}

// GET /api/auth/me  (protected - requires valid token)
async function getMe(req, res) {
  try {
    const profile = await profileModel.getProfileById(req.user.id);
    return res.status(200).json({ user: req.user, profile });
  } catch (err) {
    // Profile row might not exist yet if the DB trigger wasn't set up -
    // still return the auth user so the endpoint isn't a hard failure.
    return res.status(200).json({ user: req.user, profile: null, profileError: err.message });
  }
}

module.exports = { signup, login, logout, getMe };
