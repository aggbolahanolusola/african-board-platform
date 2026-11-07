import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Managed MySQL (TiDB Cloud, Aiven, PlanetScale, …) requires TLS. Split the URL
// into explicit credentials so drizzle-kit connects securely for migrations.
const requiresTls =
  /tidbcloud\.com|aivencloud\.com|psdb\.cloud|planetscale|[?&]ssl=|sslaccept=/.test(connectionString) ||
  process.env.DB_SSL === "true";

const u = new URL(connectionString);
const dbCredentials = requiresTls
  ? {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    }
  : { url: connectionString };

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials,
});
