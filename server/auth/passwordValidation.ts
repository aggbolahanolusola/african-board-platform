/**
 * Strong password validation utility
 * Enforces security best practices for password requirements
 */

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  "password",
  "password123",
  "12345678",
  "qwerty",
  "abc123",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "123456",
  "password1",
  "12345",
  "1234567",
  "123123",
  "000000",
  "111111",
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  // Check maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9)");
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*...)");
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("Password is too common. Please choose a more unique password");
  }

  // Check for sequential characters (e.g., "abcd", "1234")
  if (/(.)\1{3,}/.test(password)) {
    errors.push("Password contains too many repeated characters");
  }

  // Check for keyboard patterns (e.g., "qwerty", "asdfgh")
  const keyboardPatterns = [
    "qwerty",
    "asdfgh",
    "zxcvbn",
    "qazwsx",
    "12345",
    "abcde",
  ];
  if (keyboardPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    errors.push("Password contains keyboard patterns. Please choose a more random password");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get password validation error message for UI
 */
export function getPasswordValidationMessage(password: string): string | null {
  const result = validatePasswordStrength(password);
  if (result.isValid) {
    return null;
  }
  return result.errors.join(". ");
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePasswordStrength(password).isValid;
}
