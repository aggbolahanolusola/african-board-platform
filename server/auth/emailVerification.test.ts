import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateVerificationToken,
  createVerificationToken,
  verifyEmailToken,
  isEmailVerified,
  getPendingVerificationToken,
  generateVerificationLink,
} from "./emailVerification";

// Mock the db module
vi.mock("../db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  })),
}));

describe("Email Verification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateVerificationToken", () => {
    it("should generate a random token", () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes in hex = 64 characters
    });

    it("should generate a hexadecimal token", () => {
      const token = generateVerificationToken();
      expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
    });
  });

  describe("generateVerificationLink", () => {
    it("should generate a valid verification link", () => {
      const token = "test-token-123";
      const baseUrl = "https://example.com";
      const link = generateVerificationLink(token, baseUrl);

      expect(link).toBe("https://example.com/verify-email?token=test-token-123");
    });

    it("should handle base URL with trailing slash", () => {
      const token = "test-token-123";
      const baseUrl = "https://example.com/";
      const link = generateVerificationLink(token, baseUrl);

      expect(link).toBe("https://example.com//verify-email?token=test-token-123");
    });
  });

  describe("createVerificationToken", () => {
    it("should create a verification token for a user", async () => {
      const userId = 1;
      const email = "test@example.com";

      const token = await createVerificationToken(userId, email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(64);
    });

    it("should throw error if database is not available", async () => {
      const { getDb } = await import("../db");
      vi.mocked(getDb).mockResolvedValueOnce(null);

      await expect(createVerificationToken(1, "test@example.com")).rejects.toThrow(
        "Database connection not available"
      );
    });
  });

  describe("verifyEmailToken", () => {
    it("should throw error for invalid token", async () => {
      await expect(verifyEmailToken("invalid-token")).rejects.toThrow(
        "Invalid verification token"
      );
    });

    it("should throw error for expired token", async () => {
      const { getDb } = await import("../db");
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  userId: 1,
                  email: "test@example.com",
                  token: "test-token",
                  expiresAt: new Date(Date.now() - 1000), // Expired
                  verifiedAt: null,
                },
              ]),
            }),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValueOnce(mockDb as any);

      await expect(verifyEmailToken("test-token")).rejects.toThrow(
        "Verification token has expired"
      );
    });
  });

  describe("isEmailVerified", () => {
    it("should return false if no verification record exists", async () => {
      const result = await isEmailVerified(1, "test@example.com");
      expect(result).toBe(false);
    });
  });

  describe("getPendingVerificationToken", () => {
    it("should return null if no pending token exists", async () => {
      const result = await getPendingVerificationToken(1);
      expect(result).toBeNull();
    });
  });
});
