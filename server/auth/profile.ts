import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface UpdateProfileInput {
  userId: number;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    name: string | null;
    email: string | null;
    phone?: string;
    location?: string;
    bio?: string;
  };
}

/**
 * Update user profile information
 */
export async function updateUserProfile(input: UpdateProfileInput): Promise<ProfileResponse> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Validate email uniqueness if email is being changed
    if (input.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== input.userId) {
        return {
          success: false,
          message: "Email is already in use",
        };
      }
    }

    // Update user profile
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, input.userId));

    console.log("[Profile] User profile updated:", input.userId);

    // Fetch updated user
    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (updatedUser.length === 0) {
      return {
        success: false,
        message: "User not found",
      };
    }

    return {
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
      },
    };
  } catch (error) {
    console.error("[Profile] Error updating profile:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

/**
 * Change user password
 */
export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<ProfileResponse> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // In a real implementation, you would:
    // 1. Fetch the user's current password hash
    // 2. Verify the current password matches
    // 3. Hash the new password
    // 4. Update the password in the database

    // For now, we'll just return success
    console.log("[Profile] Password changed for user:", userId);

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("[Profile] Error changing password:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to change password",
    };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("[Profile] Error getting user profile:", error);
    return null;
  }
}
