# Deploying to Vercel

This app runs on Vercel as a **static client** (`dist/public`) plus a **single
serverless function** (`api/index.ts`) that hosts the tRPC API, OAuth callback,
and health check. Routing is defined in `vercel.json`. The database is external
(PlanetScale or any MySQL 8).

## Architecture on Vercel

- `vite build` → `dist/public` (served as static assets by Vercel).
- `api/index.ts` → the Express app (from `server/_core/app.ts`) as a serverless
  function. `vercel.json` rewrites `/api/*` to it and falls back all other
  routes to `index.html` for the SPA.
- No long-running server / `listen()` on Vercel. (`server/_core/index.ts` is
  still used for local `pnpm dev` / `pnpm start`.)

## 1. Database — PlanetScale

1. Create a database in PlanetScale (the schema uses **no foreign-key
   constraints**, so it is PlanetScale-compatible out of the box).
2. Copy the connection string. It looks like:
   `mysql://USER:PASSWORD@HOST/DBNAME?ssl={"rejectUnauthorized":true}`
   (PlanetScale requires TLS; keep the `ssl`/`sslaccept` parameter it gives you.)
3. Run migrations against it from your machine:
   ```bash
   DATABASE_URL='mysql://…' pnpm db:migrate
   # optional demo data:
   DATABASE_URL='mysql://…' pnpm db:seed
   ```

## 2. Environment variables (set in Vercel → Project → Settings → Environment Variables)

**Required (core features):**

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PlanetScale connection string (runtime) |
| `JWT_SECRET` | Long random string, ≥ 32 chars (runtime) |

**Optional — enable more features when ready:**

| Variable | Enables | Type |
|----------|---------|------|
| `VITE_APP_ID` | OAuth app id (baked into client) | build-time |
| `OAUTH_SERVER_URL` / `VITE_OAUTH_PORTAL_URL` | Manus OAuth login | runtime / build |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | Billing/checkout | runtime + build |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | Document uploads (S3) | runtime |
| `VITE_FRONTEND_URL` | CORS origin / absolute links | build-time |

> **Important:** `VITE_*` variables are compiled into the client at build time,
> so set them **before** the build and redeploy after changing them. The others
> are read at runtime by the function.

## 3. Deploy

Connect the repo to Vercel (Git integration) or deploy from the folder. Vercel
reads `vercel.json` automatically:

- Build command: `pnpm vite build`
- Output directory: `dist/public`
- Function: `api/index.ts` (Node runtime, 30s max duration)

## 4. Verify after deploy

- `https://<your-app>.vercel.app/api/health` → `{"status":"ok",…}`
- Load the site — the UI should render.
- Sign up / log in (needs `DATABASE_URL` + `JWT_SECRET`).
- If data calls fail: check `DATABASE_URL` is set and migrations ran.

## Notes & caveats

- **Rate limiting** uses an in-memory store, which resets per serverless cold
  start. Fine for launch; use a shared store (e.g. Upstash Redis) for strict
  global limits.
- **DB connections**: each cold start opens a new pool. PlanetScale handles this
  well; for very high concurrency consider their serverless driver.
- **OAuth / Stripe / S3 / email** only work once their credentials above are set.
- Local development is unchanged: `pnpm dev` (see `QUICKSTART.md`).
