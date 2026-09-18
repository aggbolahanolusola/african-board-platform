/**
 * Account lockout system to prevent brute force attacks
 * Tracks failed login attempts and locks accounts after threshold
 */

interface LoginAttempt {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  locked: boolean;
  lockedUntil?: number;
}

// In-memory store for failed attempts (in production, use Redis or database)
const failedAttempts = new Map<string, LoginAttempt>();

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const existing = failedAttempts.get(email);

  if (!existing) {
    // First attempt
    failedAttempts.set(email, {
      count: 1,
      firstAttemptTime: now,
      lastAttemptTime: now,
      locked: false,
    });
  } else {
    // Check if attempt window has expired
    if (now - existing.firstAttemptTime > ATTEMPT_WINDOW_MS) {
      // Reset counter
      failedAttempts.set(email, {
        count: 1,
        firstAttemptTime: now,
        lastAttemptTime: now,
        locked: false,
      });
    } else {
      // Increment counter
      existing.count++;
      existing.lastAttemptTime = now;

      // Lock account if max attempts exceeded
      if (existing.count >= MAX_ATTEMPTS) {
        existing.locked = true;
        existing.lockedUntil = now + LOCKOUT_DURATION_MS;
      }

      failedAttempts.set(email, existing);
    }
  }
}

/**
 * Clear failed attempts for an email (on successful login)
 */
export function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

/**
 * Check if account is locked
 */
export function isAccountLocked(email: string): boolean {
  const attempts = failedAttempts.get(email);

  if (!attempts) {
    return false;
  }

  if (!attempts.locked) {
    return false;
  }

  const now = Date.now();

  // Check if lockout period has expired
  if (attempts.lockedUntil && now > attempts.lockedUntil) {
    // Unlock account
    failedAttempts.delete(email);
    return false;
  }

  return true;
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutTime(email: string): number {
  const attempts = failedAttempts.get(email);

  if (!attempts || !attempts.locked || !attempts.lockedUntil) {
    return 0;
  }

  const now = Date.now();
  const remaining = attempts.lockedUntil - now;

  if (remaining <= 0) {
    // Unlock account
    failedAttempts.delete(email);
    return 0;
  }

  return Math.ceil(remaining / 1000); // Return in seconds
}

/**
 * Get failed attempt count
 */
export function getFailedAttemptCount(email: string): number {
  const attempts = failedAttempts.get(email);
  return attempts ? attempts.count : 0;
}

/**
 * Get remaining attempts before lockout
 */
export function getRemainingAttempts(email: string): number {
  const count = getFailedAttemptCount(email);
  return Math.max(0, MAX_ATTEMPTS - count);
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupOldEntries(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  failedAttempts.forEach((attempt, email) => {
    // Delete entries older than 1 hour
    if (now - attempt.lastAttemptTime > 60 * 60 * 1000) {
      entriesToDelete.push(email);
    }
  });

  entriesToDelete.forEach((email) => {
    failedAttempts.delete(email);
  });
}

/**
 * Get statistics for monitoring
 */
export function getStatistics(): {
  totalTrackedEmails: number;
  lockedAccounts: number;
  averageAttemptsPerEmail: number;
} {
  let lockedCount = 0;
  let totalAttempts = 0;

  failedAttempts.forEach((attempt) => {
    if (attempt.locked) {
      lockedCount++;
    }
    totalAttempts += attempt.count;
  });

  return {
    totalTrackedEmails: failedAttempts.size,
    lockedAccounts: lockedCount,
    averageAttemptsPerEmail:
      failedAttempts.size > 0 ? totalAttempts / failedAttempts.size : 0,
  };
}
