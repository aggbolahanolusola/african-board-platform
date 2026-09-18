/**
 * Auth session regression tests.
 *
 * Proves the latent bug fixed in the May 2026 review: email/password logins now
 * mint a session token that the app's own verifier (sdk.verifySession) accepts,
 * and the token is short-lived (SESSION_TOKEN_TTL_MS, not 7 days).
 *
 * The round-trip tests need no database; the login test self-skips without one.
 */
import { describe, it, expect } from "vitest";
import { decodeJwt } from "jose";
import "../env";
import { resetTestDb } from "../db";
import { sdk } from "../../_core/sdk";
import { ENV } from "../../_core/env";
import { SESSION_TOKEN_TTL_MS } from "@shared/const";
import { createUser } from "../factories";
import { authenticateUser } from "../../auth/login";

const dbReady = !!process.env.DATABASE_URL;

describe("Auth: session token signing & verification", () => {
  it("signs a session token that verifySession accepts (round trip)", async () => {
    const token = await sdk.signSession(
      { openId: "round-trip-user", appId: ENV.appId, name: "Round Trip" },
      { expiresInMs: SESSION_TOKEN_TTL_MS }
    );
    const payload = await sdk.verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload?.openId).toBe("round-trip-user");
  });

  it("rejects a garbage token", async () => {
    expect(await sdk.verifySession("not-a-jwt")).toBeNull();
  });

  (dbReady ? it : it.skip)(
    "email/password login issues a verifiable, short-lived session token",
    async () => {
      await resetTestDb();
      const password = "Sup3rSecret!passXY";
      const user = await createUser({ password, isEmailVerified: true });

      const result = await authenticateUser(user.email!, password);
      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();

      // The freshly minted token must verify with the app's own verifier
      // (this is exactly what failed before the fix).
      const verified = await sdk.verifySession(result.token!);
      expect(verified?.openId).toBe(user.openId);

      // ...and it must be short-lived, close to SESSION_TOKEN_TTL_MS.
      const claims = decodeJwt(result.token!);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const ttlSeconds = (claims.exp ?? 0) - (claims.iat ?? nowSeconds);
      expect(ttlSeconds).toBeGreaterThan(0);
      expect(ttlSeconds).toBeLessThanOrEqual(SESSION_TOKEN_TTL_MS / 1000 + 60);
    }
  );
});
