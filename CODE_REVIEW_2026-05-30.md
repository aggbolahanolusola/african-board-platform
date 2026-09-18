# Code Review & Fixes — African Board Platform (NurtGov)

**Date:** May 30, 2026
**Reviewer:** Claude (Cowork)
**Scope:** Security & auth, code quality/architecture, bugs & correctness — with fixes applied to the top-priority issues.
**Basis:** Consolidates and supersedes the earlier March 19, 2026 audit (the former `SECURITY_AUDIT_REPORT.md` and `APPLICATION_REVIEW.md`, now removed). Their still-relevant findings are captured in §1 below.

---

## 1. Verification of the March 2026 audit

Most of the previously reported issues have since been remediated. Verified current state:

| Prior finding | Status today |
|---|---|
| 🔴 Horizontal privilege escalation via `organizationId` in `routers.ts` | **Fixed in main routers** — org now comes from `ctx.user.organizationId`. **But the same flaw still existed in sub-modules** (see §2). |
| 🟠 Missing security headers | Fixed — `helmet` configured with CSP, HSTS, frame-ancestors in `server/_core/index.ts`. |
| 🟠 No rate limiting | Fixed — `express-rate-limit` global + stricter auth limiter. |
| 🟠 Missing CORS | Fixed — `cors` configured (note: dev uses `origin: "*"`, prod uses env URL). |
| 🟠 Weak SameSite cookie (`none`) | Fixed — now `sameSite: "strict"`, `httpOnly`, `secure` when request is HTTPS. |
| 🟡 Weak password policy (`min(8)`) | Fixed — `min(12)` plus server-side `validatePasswordStrength`. |
| 🟡 Logging sensitive info | Improved — login no longer logs email. |
| 🔴/🟠 Vulnerable deps (trpc, pnpm) | **Re-check needed** — `@trpc/*` is on 11.6.0; audit recommended ≥11.8.0. Run `pnpm audit` / bump. |
| JWT 7-day expiry | Still 7 days (see §3). |

---

## 2. New critical findings — and fixes applied

The "trust client-supplied `organizationId`" vulnerability was fixed in the top-level router but **survived in three sub-routers and two procedures**, which are wired into the live API. These allowed cross-organization access (IDOR) and, in some cases, ran with no permission or ownership checks at all. All are now fixed.

### 2.1 `meeting.getById` — cross-org meeting read (IDOR) — FIXED
`server/routers.ts` called `getMeetingById(input.meetingId)` with no organization filter, so any authenticated user could read any meeting by guessing its numeric id. Now scoped to `ctx.user.organizationId` with a `NOT_FOUND` on mismatch.

### 2.2 Voting module — no org scoping, no permission checks — FIXED
`server/voting/procedures.ts`: every procedure trusted `input.organizationId` (create/get votes & resolutions) or fetched by `voteId` with no ownership check (`castVote`, `closeVote`, `getVote`). A user in org A could read org B's votes/ballots, cast votes, or close votes. None checked `requirePermission`.
Rewrote so that: organization is always derived from the session; `voteId`/`resolutionId` lookups are scoped to the caller's org; linked `meetingId`s are verified to belong to the org; and each procedure enforces the correct permission (`manage_voting` / `vote` / `view_voting`).

### 2.3 Document module — cross-org upload/delete/quota (IDOR) — FIXED
`server/documents/upload.procedures.ts`: upload/delete/storage-info all trusted `input.organizationId`. `deleteDocument` compared `doc.organizationId` to the **client-supplied** `organizationId` (both attacker-controlled), so any document was deletable. No permission checks.
Rewrote to derive org from the session, scope the document lookup to that org, verify any linked meeting, and enforce `upload_document` / `delete_document` / `view_document`. `organizationId` is still accepted (ignored) where the client sends it, so no frontend break.

### 2.4 `payment.getSubscriptionDetails` — read any Stripe subscription (IDOR) — FIXED
Accepted an arbitrary `stripeSubscriptionId` and returned Stripe details after only a `view_billing` check. Now verifies the id belongs to the caller's org via `organizationSubscriptions` before calling Stripe.

### 2.5 JWT signed with `'default-secret'` fallback — FIXED
The remember-me login path in `routers.ts` signed session tokens with `process.env.JWT_SECRET || 'default-secret'`. If `JWT_SECRET` were ever unset, tokens would be signed with a publicly-known secret → trivial auth forgery. Now throws if the secret is missing, matching `auth/login.ts`.

> Backward compatibility: the voting/document input schemas still tolerate a `organizationId` field from the client (Zod strips/ignores it); no frontend changes are required.

---

## 3. Remaining recommendations (not yet changed)

These are worth addressing but were left for your decision since they change behaviour or need infra:

- **JWT lifetime (7 days).** Long-lived bearer tokens can't be revoked. Consider shortening the session JWT (e.g. 1–2h) and leaning on the existing remember-me token for renewal.
- **Account lockout is in-memory** (`auth/accountLockout.ts`). It resets on restart and isn't shared across instances — brute-force protection weakens when horizontally scaled. Move to the DB or a shared store.
- **Dependency bump.** `@trpc/server` 11.6.0 → ≥11.8.0; run `pnpm audit` and patch.
- **No pagination** on list endpoints (`meeting.list`, `document.list`, votes, audit logs). Fine now, a problem at scale.
- **CORS in dev is `"*"` with credentials** — acceptable for local dev only; make sure prod always sets `VITE_FRONTEND_URL`.
- **`getById`-style endpoints** generally: keep the "scope every lookup to `ctx.user.organizationId`" rule as the default pattern for all new procedures — consider a small helper or a `orgScopedProcedure` middleware to make this structural rather than per-procedure.
- **Type safety.** Several procedures use `async ({ input, ctx }: any)`; tightening these would catch issues like the ones above at compile time.

---

## 4. Files changed

- `server/routers.ts` — `meeting.getById` org scoping; `payment.getSubscriptionDetails` ownership check; remember-me JWT secret hardening; import cleanup.
- `server/voting/procedures.ts` — full rewrite for org scoping + permission checks.
- `server/documents/upload.procedures.ts` — full rewrite for org scoping + permission checks.

## 5. Second pass — middleware, JWT, and a latent auth bug (also applied)

### 5.1 `orgScopedProcedure` middleware (structural fix)
Added `orgScopedProcedure` in `server/_core/trpc.ts`: a procedure that guarantees `ctx.user.organizationId` exists and exposes a non-null `ctx.organizationId`. The voting and document procedures now build on it, so org-scoping is structural rather than a per-handler manual check. Use this for all new org-scoped endpoints.

### 5.2 Latent bug found & fixed — email/password sessions never verified
`server/auth/login.ts` signed the session cookie with `jsonwebtoken` and a `{ id, email, openId }` payload, but `sdk.verifySession` (jose) requires `openId`, `appId`, and a non-empty `name`. So email/password logins produced a cookie that failed verification on the very next request (only the Manus OAuth path, which uses `sdk.createSessionToken`, worked). Both `login.ts` and the remember-me path now mint the session via `sdk.signSession` with the correct payload — fixing the bug and making the token type consistent.

### 5.3 Shorter session lifetime + renewal
Session tokens for email/password and remember-me logins now use `SESSION_TOKEN_TTL_MS` (2h, in `shared/const.ts`) instead of 7 days. The existing remember-me token is the renewal mechanism. The `'default-secret'` JWT fallback was also removed (now throws if `JWT_SECRET` is unset).

## 6. Verification

- `pnpm install` — clean.
- `tsc --noEmit` (full project, client + server) — **0 errors**.
- `vitest run` — **329 passed**, 19 failed. All 19 failures are "Database unavailable" in the DB-backed auth/organization suites (no `DATABASE_URL` in the verification sandbox); every test that doesn't require a live DB passes, including the permissions, permission-integration, meetings, recordings, and team suites. No failure is attributable to these changes.

> Recommend a final local `pnpm check && pnpm test` against a real database before commit.

## 7. Files changed (cumulative)

- `server/_core/trpc.ts` — new `orgScopedProcedure` middleware.
- `server/routers.ts` — `meeting.getById` org scoping; `payment.getSubscriptionDetails` ownership check; remember-me token via `sdk.signSession` + secret hardening.
- `server/voting/procedures.ts` — org scoping + permission checks; built on `orgScopedProcedure`.
- `server/documents/upload.procedures.ts` — org scoping + permission checks; built on `orgScopedProcedure`.
- `server/auth/login.ts` — session token via `sdk.signSession` (fixes verification bug) with short TTL.
- `shared/const.ts` — `SESSION_TOKEN_TTL_MS`.
