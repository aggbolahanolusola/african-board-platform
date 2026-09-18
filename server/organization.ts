import { eq, and, count } from "drizzle-orm";
import { getDb } from "./db";
import { organizations, organizationSubscriptions, subscriptionPlans, invoices, users, meetings, documents } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

export async function getOrganizationStats(organizationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Organization] Database unavailable for stats");
    return {
      organization: null,
      subscription: null,
      memberCount: 0,
    };
  }

  try {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org.length) {
      return {
        organization: null,
        subscription: null,
        memberCount: 0,
      };
    }

    const sub = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    // Get actual member count from users table
    const memberCountResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    const memberCount = memberCountResult[0]?.count || 0;

    return {
      organization: org[0],
      subscription: sub[0] || null,
      memberCount,
    };
  } catch (error) {
    console.error("[Organization] Failed to get stats:", error);
    return {
      organization: null,
      subscription: null,
      memberCount: 0,
    };
  }
}

export async function getOrganizationMembers(organizationId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        userRole: users.userRole,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    return members;
  } catch (error) {
    console.error("[Organization] Failed to get members:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch members" });
  }
}

export async function addOrganizationMember(
  organizationId: number,
  email: string,
  role: "boardMember" | "secretary" | "administrator" | "complianceOfficer"
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists, update their role and organization
      const user = existingUser[0];
      await db
        .update(users)
        .set({
          organizationId,
          userRole: role,
        })
        .where(eq(users.id, user.id));

      return { success: true, memberId: user.id };
    } else {
      // Create new user with invitation
      const result = await db.insert(users).values({
        email,
        name: email.split("@")[0],
        organizationId,
        userRole: role,
        openId: `invited_${email}_${Date.now()}`,
        loginMethod: "email",
        isEmailVerified: false,
      });

      return { success: true, memberId: Number((result as any).insertId) };
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Organization] Failed to add member:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add member" });
  }
}

export async function removeOrganizationMember(organizationId: number, memberId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    // Check if user belongs to organization
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, memberId), eq(users.organizationId, organizationId)))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found in organization" });
    }

    // Remove user from organization
    await db
      .update(users)
      .set({ organizationId: null })
      .where(eq(users.id, memberId));

    return { success: true };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Organization] Failed to remove member:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to remove member" });
  }
}

export async function updateOrganizationMemberRole(
  organizationId: number,
  memberId: number,
  role: "boardMember" | "secretary" | "administrator" | "complianceOfficer"
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    // Check if user belongs to organization
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, memberId), eq(users.organizationId, organizationId)))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found in organization" });
    }

    // Update user role
    await db
      .update(users)
      .set({ userRole: role })
      .where(eq(users.id, memberId));

    return { success: true };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Organization] Failed to update member role:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update member role" });
  }
}

export async function getOrganizationBillingHistory(organizationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Organization] Database unavailable for billing history");
    return [];
  }

  try {
    const history = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));

    return history;
  } catch (error) {
    console.error("[Organization] Failed to get billing history:", error);
    return [];
  }
}

export async function getOrganizationUsageStats(organizationId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    // Get actual member count
    const memberCountResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    const members = memberCountResult[0]?.count || 0;

    // Get actual meeting count for this month
    // For now, use a simple count without date filtering due to Drizzle ORM limitations
    const meetingCountResult = await db
      .select({ count: count() })
      .from(meetings)
      .where(eq(meetings.organizationId, organizationId));

    // TODO: Filter meetings by month once Drizzle ORM date filtering is properly configured
    const meetingsThisMonth = 0;

    // Get subscription plan limits
    const subscription = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    let maxMembers = 25;
    let storageLimit = 5 * 1024 * 1024 * 1024; // 5GB default
    let storageUsed = 0;

    if (subscription.length > 0) {
      const planId = subscription[0].planId;
      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      if (plan.length > 0) {
        maxMembers = plan[0].maxUsers || 25;
        storageLimit = (plan[0].maxStorage || 5) * 1024 * 1024 * 1024;
      }

      // Get actual storage used from subscription
      storageUsed = subscription[0].storageUsed;
    }

    return {
      members,
      maxMembers,
      memberUsagePercent: Math.round((members / maxMembers) * 100),
      storageUsed,
      storageLimit,
      storageUsagePercent: Math.round((storageUsed / storageLimit) * 100),
      meetingsThisMonth,
      maxMeetingsPerMonth: null,
    };
  } catch (error) {
    console.error("[Organization] Failed to get usage stats:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch usage stats" });
  }
}

export async function createOrganization(
  name: string,
  country: string,
  timezone: string,
  complianceFrameworks: string[] = []
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    const result = await db.insert(organizations).values({
      name,
      country,
      timezone,
      complianceFrameworks,
    });

    // Get the inserted organization ID
    const insertedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, name))
      .orderBy((t) => t.id)
      .limit(1);

    if (!insertedOrgs.length) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created organization" });
    }

    const organizationId = insertedOrgs[0].id;

    // Create a default starter subscription for the new organization
    try {
      const starterPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.slug, "starter"))
        .limit(1);

      if (starterPlan.length > 0) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Default storage limit: 5GB for starter plan
        const defaultStorageLimit = 5 * 1024 * 1024 * 1024; // 5GB in bytes
        
        await db.insert(organizationSubscriptions).values({
          organizationId,
          planId: starterPlan[0].id,
          status: "active",
          billingCycle: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: expiresAt,
          storageUsed: 0,
          storageLimit: defaultStorageLimit,
        });
      }
    } catch (subError) {
      console.warn("[Organization] Failed to create default subscription:", subError);
    }

    return { success: true, organizationId };
  } catch (error) {
    console.error("[Organization] Failed to create organization:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create organization" });
  }
}

export async function getOrganizationById(organizationId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  try {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org.length) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }

    return org[0];
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Organization] Failed to get organization:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch organization" });
  }
}
