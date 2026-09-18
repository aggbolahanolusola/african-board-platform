# Test Bed

A local, reproducible environment for running the African Board Platform (NurtGov) and its test suite against a real MySQL database.

## What you get

- **`docker-compose.yml`** — MySQL 8 with two databases: `nurtgov` (dev) and `nurtgov_test` (tests).
- **`.env.example`** — all environment variables, pre-filled to match the compose file.
- **`scripts/seed.ts`** — seeds demo orgs, users (one per role), meetings, votes, resolutions and documents.
- **`server/test/`** — the test harness: DB lifecycle, data factories, and a tRPC caller helper.
- **Integration tests** under `server/test/integration/` — including cross-organization (IDOR) security regressions and auth-session verification.

## Prerequisites

- Docker (for the database) and Node + pnpm.

## One-time setup

```bash
cp .env.example .env          # adjust if needed
pnpm install
pnpm db:up                    # start MySQL (creates nurtgov + nurtgov_test)
pnpm db:migrate               # apply drizzle migrations to the dev database
pnpm db:seed                  # load demo data (optional)
```

Then run the app as usual:

```bash
pnpm dev                      # http://localhost:5173
```

### Demo logins (after `pnpm db:seed`)

All verified, password **`DemoPass123!`**:

| Email | Role | Organization |
|-------|------|--------------|
| admin@nurtgov.test | administrator | Acme Holdings |
| secretary@nurtgov.test | secretary | Acme Holdings |
| board@nurtgov.test | boardMember | Acme Holdings |
| compliance@nurtgov.test | complianceOfficer | Acme Holdings |
| admin-b@nurtgov.test | administrator | Beta Ventures |

## Running tests

```bash
pnpm db:up            # ensure MySQL is running
pnpm test             # full suite
pnpm test:integration # only the DB-backed integration suites
pnpm test:watch       # watch mode
```

The test harness points the app at `TEST_DATABASE_URL` (the `nurtgov_test` database), runs migrations automatically, and truncates tables between tests. **If no database is reachable, the integration suites skip themselves** rather than fail — so unit tests still run anywhere (e.g. CI without Docker).

## How it works

- `server/test/env.ts` — loads `.env.test`/`.env` and points `DATABASE_URL` at the test database, with safe defaults for `JWT_SECRET` / `VITE_APP_ID`.
- `server/test/db.ts` — `isDbAvailable()`, `migrateTestDb()`, `resetTestDb()`.
- `server/test/factories.ts` — `createOrganization`, `createUser`, `createMeeting`, `createVote`, `createDocument`, `createResolution`, plans & subscriptions.
- `server/test/caller.ts` — `callerFor(user)` returns an `appRouter` caller authenticated as that user, so procedures are exercised exactly as a real request would.
- `server/test/setup.ts` — vitest `setupFiles`: loads env and migrates once when a DB is present.

## Writing a new integration test

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { isDbAvailable, resetTestDb } from "../db";
import { callerFor } from "../caller";
import { createOrganization, createUser } from "../factories";

const suite = (await isDbAvailable()) ? describe : describe.skip;

suite("my feature", () => {
  beforeEach(async () => { await resetTestDb(); });

  it("does the thing", async () => {
    const org = await createOrganization();
    const user = await createUser({ organizationId: org.id, userRole: "administrator" });
    const result = await callerFor(user).organization.getStats();
    expect(result).toBeDefined();
  });
});
```

## Notes

- The existing DB-backed suites (`server/organization.test.ts`, `server/auth/authentication.test.ts`) now run against the test bed once MySQL is up — no code change needed, since `setupFiles` provides `DATABASE_URL`.
- `pnpm db:reset` wipes and recreates the database volume from scratch.
