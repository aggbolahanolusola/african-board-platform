// Drops and recreates the database named in DATABASE_URL, then exits.
// Use before `pnpm db:migrate` when a prior migration left a partial schema
// (MySQL/TiDB auto-commit DDL, so failed migrations can't fully roll back).
//
//   node scripts/db-reset.mjs
//
// Requires DATABASE_URL to be set. Connects over TLS (needed for TiDB/Aiven).
import mysql from "mysql2/promise";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const u = new URL(raw);
const db = u.pathname.replace(/^\//, "");
if (!db) {
  console.error("DATABASE_URL has no database name in its path.");
  process.exit(1);
}

const needsTls =
  /tidbcloud\.com|aivencloud\.com|psdb\.cloud|planetscale|[?&]ssl=|sslaccept=/.test(raw) ||
  process.env.DB_SSL === "true";

const conn = await mysql.createConnection({
  host: u.hostname,
  port: u.port ? Number(u.port) : 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  ssl: needsTls ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  // Note: no `database` selected, so DROP/CREATE work even if it is missing.
});

console.log(`[db-reset] dropping and recreating \`${db}\` ...`);
await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
await conn.query(`CREATE DATABASE \`${db}\``);
await conn.end();
console.log(`[db-reset] done. Now run: pnpm db:migrate && pnpm db:seed`);
