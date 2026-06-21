# Shopping App — Backend Starter (Express + Supabase, MVC)

This is the foundation: database connectivity + login/signup, structured as
MVC, so you can keep building (products, cart, orders) on top of it.

## 1. Folder structure (MVC)

```
shopping-app/
├── config/
│   └── supabaseClient.js     # the ONE place that connects to Supabase
├── models/
│   └── profileModel.js       # database queries (the "M")
├── controllers/
│   └── authController.js     # business logic (the "C")
├── routes/
│   └── authRoutes.js         # URL -> controller mapping
├── middleware/
│   └── authMiddleware.js     # verifies login token on protected routes
├── public/                   # the "V" — plain HTML/CSS/JS frontend
│   ├── login.html
│   ├── signup.html
│   ├── index.html            # dashboard (protected page)
│   ├── css/style.css
│   └── js/ (api.js, login.js, signup.js, dashboard.js)
├── schema.sql                 # run this in Supabase once
├── server.js                  # app entry point
├── .env.example
└── package.json
```

As you add features later (e.g. products), follow the same pattern:
`models/productModel.js` → `controllers/productController.js` →
`routes/productRoutes.js`, mounted in `server.js`.

## 2. Set up Supabase

1. Create a free project at https://supabase.com.
2. Go to **Project Settings → API**. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this one secret, server-only)
3. Go to **SQL Editor → New query**, paste the contents of `schema.sql`,
   and run it. This creates a `profiles` table and a trigger that
   auto-fills it whenever someone signs up.

## 3. Configure the project

```bash
cd shopping-app
cp .env.example .env
```

Open `.env` and paste in your Supabase URL + keys.

```bash
npm install
npm run dev      # uses nodemon, restarts on file changes
# or: npm start
```

Server runs at **http://localhost:5000**.

## 4. Try it

Open these in your browser:
- http://localhost:5000/signup.html
- http://localhost:5000/login.html
- http://localhost:5000/index.html (redirects to login if no valid token)

Or test the API directly:

```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Log in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the access_token from the login response:
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 5. How auth works here (worth understanding, not just copying)

- Supabase has its own built-in `auth.users` table — it handles password
  hashing, sessions, and tokens for you. You don't write password logic.
- `authController.js` calls `supabase.auth.signUp()` / `signInWithPassword()`.
  Supabase returns a `session.access_token` (a JWT).
- The frontend stores that token (here, in `localStorage` — fine for
  learning; for a real client-facing product you'd usually look at
  httpOnly cookies later) and sends it as `Authorization: Bearer <token>`
  on every request that needs to know who's logged in.
- `authMiddleware.js` verifies that token on protected routes
  (e.g. `GET /api/auth/me`) before letting the request through.
- `profileModel.js` is a separate table for extra info (name, etc.)
  that Supabase's own users table doesn't store. A database trigger
  (in `schema.sql`) keeps it filled in automatically on signup.

## 6. Notes for "Confirm email"

By default, new Supabase projects require email confirmation before a
session is issued — signup will succeed but `session` will be `null`
until the user clicks the email link. You can turn this off for local
testing in **Authentication → Providers → Email → Confirm email**.

## 7. What's next

Once this feels solid, the natural next step is a `products` table +
`productModel.js` / `productController.js` / `routes/productRoutes.js`
following the exact same pattern — happy to help with that next.
