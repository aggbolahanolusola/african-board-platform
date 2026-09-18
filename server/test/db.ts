/**
 * Test database lifecycle helpers: availability probing, migrations, and reset.
 *
 * The app's own `getDb()` (server/db.ts) reads DATABASE_URL, which env.ts points
 * at the test database. These helpers manage a separate connection used only to
 * run migrations and to truncate tables between tests.
 */
import "./env";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { sql } from "drizzle-orm";
import path from "path";

let migrated = false;

/** Returns true if a test database is configured AND reachable. */
export async function isDbAvailable(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const conn = await mysql.createConnection(url);
    await conn.ping();
    await conn.end();
    return true;
  } catch {
    return false;
  }
}

/** Runs drizzle migrations against the test database (idempotent, once per run). */
export async function migrateTestDb(): Promise<void> {
  if (migrated) return;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL/TEST_DATABASE_URL is not set");
  const pool = mysql.createPool(url);
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  await pool.end();
  migrated = true;
}

// Tables truncated between tests. Order is irrelevant because FK checks are
// disabled during the operation. `__drizzle_migrations` is intentionally kept.
const TABLES = [
  "voteBallots",
  "votes",
  "resolutions",
  "signatures",
  "documentPermissions",
  "documents",
  "agendas",
  "meetingParticipants",
  "meetings",
  "notifications",
  "organizationSubscriptions",
  "auditLogs",
  "complianceLogs",
  "complianceAssessments",
  "tasks",
  "rememberMeTokens",
  "emailVerificationTokens",
  "passwordResetTokens",
  "invoices",
  "users",
  "organizations",
  "subscriptionPlans",
];

/** Removes all rows from application tables. Safe to call before each test. */
export async function resetTestDb(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const pool = mysql.createPool(url);
  const db = drizzle(pool);
  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    for (const table of TABLES) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``));
      } catch {
        // Table may not exist in every schema revision; ignore.
      }
    }
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  } finally {
    await pool.end();
  }
}
