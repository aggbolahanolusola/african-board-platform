# Quick Start — build & run locally

The app is a single Express server that serves the React client and the tRPC API.
Everything below runs from the project root. Requires **Node 20+**, **pnpm**, and
**Docker** (for the database).

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

`.env` is already filled in to match the bundled Docker database. The only value
you may want to change is `JWT_SECRET` (any long random string works locally).

## 3. Start the database

```bash
pnpm db:up        # starts MySQL 8 in Docker (creates nurtgov + nurtgov_test)
pnpm db:migrate   # creates all tables
pnpm db:seed      # optional: loads demo orgs, users, meetings, votes
```

## 4. Run the app

Development (hot reload):

```bash
pnpm dev
```

Production build + run:

```bash
pnpm build
pnpm start
```

Either way the app is served at **http://localhost:3000**
(if 3000 is busy it picks the next free port and prints the URL).

## Demo logins (after `pnpm db:seed`)

Password for all: **`DemoPass123!`**

| Email | Role | Organization |
|-------|------|--------------|
| admin@nurtgov.test | administrator | Acme Holdings |
| secretary@nurtgov.test | secretary | Acme Holdings |
| board@nurtgov.test | boardMember | Acme Holdings |
| compliance@nurtgov.test | complianceOfficer | Acme Holdings |
| admin-b@nurtgov.test | administrator | Beta Ventures |

## Verify / troubleshoot

```bash
pnpm check      # TypeScript type-check (should be clean)
pnpm test       # unit + integration tests (DB-backed suites run when db:up)
```

- **App loads but data calls fail / return empty** → the database isn't running.
  Run `pnpm db:up && pnpm db:migrate`. Read-only pages (e.g. pricing) degrade to
  empty rather than erroring; data pages need the DB.
- **No Docker?** Point `DATABASE_URL` / `TEST_DATABASE_URL` in `.env` at any
  MySQL 8 instance, then run `pnpm db:migrate`.
- **Port 3000 in use** → set `PORT=4000` (or any free port) before the run command.

See `TESTBED.md` for the full test harness and `CODE_REVIEW_2026-05-30.md` for the
security/architecture review.
