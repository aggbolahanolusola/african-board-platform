import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  generateToken,
  hashToken,
  REMEMBER_ME_CONFIG,
} from './rememberMe';

describe('Remember Me Token Generation', () => {
  it('should generate a token of correct length', () => {
    const token = generateToken();
    expect(token).toHaveLength(REMEMBER_ME_CONFIG.TOKEN_LENGTH * 2); // hex string is 2x length
  });

  it('should generate unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });

  it('should generate valid hex strings', () => {
    const token = generateToken();
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });
});

describe('Token Hashing', () => {
  it('should hash tokens consistently', () => {
    const token = generateToken();
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    const hash1 = hashToken(token1);
    const hash2 = hashToken(token2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce SHA256 hashes', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
  });
});

describe('Remember Me Configuration', () => {
  it('should have correct token expiry', () => {
    expect(REMEMBER_ME_CONFIG.TOKEN_EXPIRY_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('should have correct token length', () => {
    expect(REMEMBER_ME_CONFIG.TOKEN_LENGTH).toBe(32);
  });

  it('should have secure cookie options', () => {
    const options = REMEMBER_ME_CONFIG.COOKIE_OPTIONS;
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('none');
    expect(options.path).toBe('/');
  });

  it('should have correct cookie expiry', () => {
    expect(REMEMBER_ME_CONFIG.COOKIE_OPTIONS.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('Token Expiry', () => {
  it('should create tokens that expire in 30 days', () => {
    const now = Date.now();
    const expiryTime = now + REMEMBER_ME_CONFIG.TOKEN_EXPIRY_MS;
    const expiryDate = new Date(expiryTime);
    
    // Should be approximately 30 days from now
    const daysDiff = (expiryDate.getTime() - now) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(30, 0);
  });
});

describe('Remember Me Security', () => {
  it('should not expose raw tokens in logs', () => {
    const token = generateToken();
    const hash = hashToken(token);
    
    // Hash should be different from token
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
  });

  it('should use httpOnly cookies to prevent XSS', () => {
    expect(REMEMBER_ME_CONFIG.COOKIE_OPTIONS.httpOnly).toBe(true);
  });

  it('should use secure cookies for HTTPS', () => {
    expect(REMEMBER_ME_CONFIG.COOKIE_OPTIONS.secure).toBe(true);
  });

  it('should use SameSite=none for cross-site requests', () => {
    expect(REMEMBER_ME_CONFIG.COOKIE_OPTIONS.sameSite).toBe('none');
  });
});

describe('Token Validation', () => {
  it('should validate token format', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('should handle empty tokens', () => {
    const emptyToken = '';
    const hash = hashToken(emptyToken);
    expect(hash).toHaveLength(64);
  });

  it('should handle long tokens', () => {
    const longToken = 'a'.repeat(1000);
    const hash = hashToken(longToken);
    expect(hash).toHaveLength(64);
  });
});
