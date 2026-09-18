import { buildApp } from "../server/_core/app";

/**
 * Vercel serverless entry point.
 *
 * An Express app is itself a valid (req, res) request handler, so we export it
 * directly for the @vercel/node runtime. Static client assets are served by
 * Vercel from `dist/public`; this function handles every `/api/*` route
 * (tRPC, OAuth callback, health) per the rewrites in vercel.json.
 */
const app = buildApp();

export default app;
