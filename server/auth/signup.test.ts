import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserAccount, SignUpInput } from "./signup";

// Mock the db module
vi.mock("../db", () => ({
  getDb: vi.fn(),
  upsertUser: vi.fn(),
}));

// Mock the email verification module
vi.mock("./emailVerification", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("mock-token-123"),
}));

// Mock the send verification email module
vi.mock("./sendVerificationEmail", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
}));

describe("SignUp Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a user account with valid input", async () => {
    const { getDb, upsertUser } = await import("../db");
    const mockGetDb = vi.mocked(getDb);
    const mockUpsertUser = vi.mocked(upsertUser);

    // Mock database with select and insert methods
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([]) // First call: check existing user
              .mockResolvedValueOnce([{ id: 1, email: "john@example.com" }]), // Second call: get created user
          }),
        }),
      }),
    };

    mockGetDb.mockResolvedValue(mockDb as any);
    mockUpsertUser.mockResolvedValueOnce(undefined);

    const input: SignUpInput = {
      name: "John Doe",
      email: "john@example.com",
      password: "SecurePassword123!@#",
    };

    const result = await createUserAccount(input);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Account created successfully");
    expect(mockUpsertUser).toHaveBeenCalled();
  });

  it("should reject duplicate email addresses", async () => {
    const { getDb } = await import("../db");
    const mockGetDb = vi.mocked(getDb);

    // Mock database that returns existing user
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              { id: 1, email: "existing@example.com" },
            ]),
          }),
        }),
      }),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const input: SignUpInput = {
      name: "Duplicate User",
      email: "existing@example.com",
      password: "DuplicatePassword123!@#",
    };

    const result = await createUserAccount(input);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Email already registered");
  });

  it("should handle database errors gracefully", async () => {
    const { getDb } = await import("../db");
    const mockGetDb = vi.mocked(getDb);

    mockGetDb.mockResolvedValue(null);

    const input: SignUpInput = {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "AnotherSecurePassword123!@#",
    };

    await expect(createUserAccount(input)).rejects.toThrow(
      "Database connection not available"
    );
  });

  it("should create user with correct email encoding in openId", async () => {
    const { getDb, upsertUser } = await import("../db");
    const mockGetDb = vi.mocked(getDb);
    const mockUpsertUser = vi.mocked(upsertUser);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([]) // check existing user
              .mockResolvedValueOnce([{ id: 1, email: "test@example.com" }]), // get created user
          }),
        }),
      }),
    };

    mockGetDb.mockResolvedValue(mockDb as any);
    mockUpsertUser.mockResolvedValueOnce(undefined);

    const input: SignUpInput = {
      name: "Test User",
      email: "test@example.com",
      password: "TestPassword123!@#",
    };

    await createUserAccount(input);

    const callArgs = mockUpsertUser.mock.calls[0][0];
    expect(callArgs.openId).toContain("email_");
    expect(callArgs.email).toBe("test@example.com");
    expect(callArgs.loginMethod).toBe("email");
    expect(callArgs.passwordHash).toBeDefined();
  });

  it("should create verification token on signup", async () => {
    const { getDb, upsertUser } = await import("../db");
    const { createVerificationToken } = await import("./emailVerification");

    const mockGetDb = vi.mocked(getDb);
    const mockUpsertUser = vi.mocked(upsertUser);
    const mockCreateToken = vi.mocked(createVerificationToken);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([]) // check existing user
              .mockResolvedValueOnce([{ id: 1, email: "token@example.com" }]), // get created user
          }),
        }),
      }),
    };

    mockGetDb.mockResolvedValue(mockDb as any);
    mockUpsertUser.mockResolvedValueOnce(undefined);

    const input: SignUpInput = {
      name: "Token Test",
      email: "token@example.com",
      password: "TokenPassword123!@#",
    };

    await createUserAccount(input);

    expect(mockCreateToken).toHaveBeenCalledWith(1, "token@example.com");
  });

  it("should send verification email on signup", async () => {
    const { getDb, upsertUser } = await import("../db");
    const { sendVerificationEmail } = await import("./sendVerificationEmail");

    const mockGetDb = vi.mocked(getDb);
    const mockUpsertUser = vi.mocked(upsertUser);
    const mockSendEmail = vi.mocked(sendVerificationEmail);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([]) // check existing user
              .mockResolvedValueOnce([{ id: 1, email: "emailtest@example.com" }]), // get created user
          }),
        }),
      }),
    };

    mockGetDb.mockResolvedValue(mockDb as any);
    mockUpsertUser.mockResolvedValueOnce(undefined);

    const input: SignUpInput = {
      name: "Email Test",
      email: "emailtest@example.com",
      password: "EmailPassword123!@#",
    };

    await createUserAccount(input);

    expect(mockSendEmail).toHaveBeenCalled();
    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.email).toBe("emailtest@example.com");
    expect(callArgs.userName).toBe("Email Test");
  });
});
