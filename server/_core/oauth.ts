import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  console.log("[OAuth] Registering OAuth routes");
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    console.log("[OAuth] Callback invoked");
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Starting callback with code and state");
      let tokenResponse;
      try {
        tokenResponse = await sdk.exchangeCodeForToken(code, state);
        console.log("[OAuth] Token exchange successful");
      } catch (error) {
        console.error("[OAuth] Token exchange failed:", error instanceof Error ? error.message : error);
        throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      let userInfo;
      try {
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
        console.log("[OAuth] User info retrieved:", { openId: userInfo.openId, email: userInfo.email });
      } catch (error) {
        console.error("[OAuth] Get user info failed:", error instanceof Error ? error.message : error);
        throw new Error(`Get user info failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (!userInfo.openId) {
        console.error("[OAuth] Missing openId in user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      try {
        console.log("[OAuth] Upserting user to database");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
        console.log("[OAuth] User upserted successfully");
      } catch (error) {
        console.error("[OAuth] User upsert failed:", error instanceof Error ? error.message : error);
        throw new Error(`User upsert failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        console.log("[OAuth] Creating session token");
        const sessionToken = await sdk.createSessionToken(userInfo.openId, {
          name: userInfo.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        console.log("[OAuth] Session token created");

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        console.log("[OAuth] Cookie set, redirecting to home");

        res.redirect(302, "/");
      } catch (error) {
        console.error("[OAuth] Session creation failed:", error instanceof Error ? error.message : error);
        throw new Error(`Session creation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("[OAuth] Callback failed:", error instanceof Error ? error.message : error);
      if (error instanceof Error) {
        console.error("[OAuth] Error stack:", error.stack);
      }
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
