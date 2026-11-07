import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Builds the configured Express application (security middleware, CORS, rate
 * limiting, OAuth routes and the tRPC API) WITHOUT binding to a port or serving
 * static assets.
 *
 * This is shared by two entry points:
 *  - server/_core/index.ts  — the long-running Node server (adds static/vite + listen)
 *  - api/index.ts           — the Vercel serverless handler (static served by Vercel)
 */
export function buildApp() {
  const app = express();

  // Trust the platform proxy (Vercel / load balancer) for correct client IP
  // and https detection (secure cookies).
  app.set("trust proxy", 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "manus-analytics.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://manus-analytics.com"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS. The client is served from the same origin as the API, so this mainly
  // guards against unexpected cross-origin callers in production.
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? [process.env.VITE_FRONTEND_URL || "https://afrigovboard-xmp6ht3c.manus.space"]
          : "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    next();
  });

  // Rate limiting. Note: the default store is in-memory, so on serverless the
  // window resets per cold start. Fine for launch; move to a shared store
  // (e.g. Redis/Upstash) if you need strict global limits.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", limiter);
  app.use("/api/trpc/auth.signUp", authLimiter);
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.loginWithRememberMe", authLimiter);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Lightweight health check for uptime monitoring / deploy verification.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] Error at ${path}:`, error);
        }
      },
    })
  );

  return app;
}
