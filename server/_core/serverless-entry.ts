import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app";

/**
 * Serverless entry for Vercel's Build Output API. Produced as a single
 * self-contained bundle by scripts/vercel-build.mjs (which sidesteps the
 * per-file ESM transpile that cannot resolve extensionless relative imports).
 *
 * Static assets are served by Vercel's filesystem handler; this function
 * handles /api/* (from buildApp) and falls back to index.html for client-side
 * routes (SPA). index.html is copied next to this bundle at build time.
 */
const app = buildApp();

const dir = path.dirname(fileURLToPath(import.meta.url));

// SPA fallback: any non-/api route that isn't a static file returns the app shell.
app.get("*", (_req, res) => {
  res.sendFile(path.join(dir, "index.html"));
});

export default app;
