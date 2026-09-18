/**
 * Loads environment for the test bed. Prefers `.env.test`, then `.env`.
 * Ensures the application code (which reads DATABASE_URL) talks to the test
 * database, and provides sane defaults for auth-related variables so tests do
 * not depend on a developer's personal configuration.
 */
import dotenv from "dotenv";
import path from "path";

const root = process.cwd();
dotenv.config({ path: path.resolve(root, ".env.test") });
dotenv.config({ path: path.resolve(root, ".env") });

// Point the app at the dedicated test database when one is configured.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Deterministic defaults so auth/session tests do not require real secrets.
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-only-secret-change-me-0123456789abcdef";
process.env.VITE_APP_ID = process.env.VITE_APP_ID || "test-app";

export const TEST_DATABASE_URL = process.env.DATABASE_URL || "";
