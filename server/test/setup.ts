/**
 * Vitest global setup file (referenced from vitest.config.ts `setupFiles`).
 * Loads test environment so every test sees DATABASE_URL / JWT_SECRET, and runs
 * migrations once when a database is reachable. When no database is available
 * (e.g. CI without the docker test bed), integration suites self-skip.
 */
import { beforeAll } from "vitest";
import "./env";
import { isDbAvailable, migrateTestDb } from "./db";

beforeAll(async () => {
  if (await isDbAvailable()) {
    await migrateTestDb();
  } else {
    console.warn(
      "[testbed] No database reachable at DATABASE_URL/TEST_DATABASE_URL — " +
        "integration suites will be skipped. Start it with `docker compose up -d` " +
        "(see TESTBED.md)."
    );
  }
});
