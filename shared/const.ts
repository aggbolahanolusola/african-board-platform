export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

/**
 * Lifetime of a short-lived session token (email/password & remember-me logins).
 * Kept short so a leaked session cookie has a small window of validity; the
 * separate remember-me token is used to mint a fresh session when this expires.
 */
export const SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
