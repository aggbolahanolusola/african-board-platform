/**
 * Data factories for the test bed. Each helper inserts a row using the app's
 * own database connection (server/db.ts) and returns the persisted record, so
 * tests can build realistic scenarios with minimal boilerplate.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  organizations,
  users,
  meetings,
  votes,
  voteBallots,
  resolutions,
  documents,
  subscriptionPlans,
  organizationSubscriptions,
  type Organization,
  type User,
  type Meeting,
  type Vote,
  type Resolution,
  type Document,
} from "../../drizzle/schema";

let counter = 0;
const uniq = () => `${Date.now()}_${++counter}`;

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Test database not available");
  return d;
}

export async function createOrganization(
  overrides: Partial<typeof organizations.$inferInsert> = {}
): Promise<Organization> {
  const d = await db();
  const res = await d.insert(organizations).values({
    name: `Org ${uniq()}`,
    country: "Nigeria",
    timezone: "Africa/Lagos",
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return row[0];
}

export async function createUser(
  overrides: Partial<typeof users.$inferInsert> & { password?: string } = {}
): Promise<User> {
  const d = await db();
  const { password, ...rest } = overrides;
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const id = uniq();
  const res = await d.insert(users).values({
    openId: `test_${id}`,
    name: `User ${id}`,
    email: `user_${id}@example.com`,
    loginMethod: "email",
    passwordHash,
    isEmailVerified: true,
    role: "user",
    userRole: "administrator",
    ...rest,
  });
  const newId = (res as any)[0].insertId as number;
  const row = await d.select().from(users).where(eq(users.id, newId)).limit(1);
  return row[0];
}

export async function createMeeting(
  organizationId: number,
  createdBy: number,
  overrides: Partial<typeof meetings.$inferInsert> = {}
): Promise<Meeting> {
  const d = await db();
  const res = await d.insert(meetings).values({
    organizationId,
    title: `Meeting ${uniq()}`,
    scheduledAt: new Date(),
    timezone: "Africa/Lagos",
    meetingType: "board",
    status: "scheduled",
    createdBy,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return row[0];
}

export async function createVote(
  organizationId: number,
  createdBy: number,
  overrides: Partial<typeof votes.$inferInsert> = {}
): Promise<Vote> {
  const d = await db();
  const res = await d.insert(votes).values({
    organizationId,
    title: `Vote ${uniq()}`,
    votingMethod: "majority",
    status: "open",
    result: "pending",
    createdBy,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(votes).where(eq(votes.id, id)).limit(1);
  return row[0];
}

export async function createBallot(
  voteId: number,
  userId: number,
  choice: "yes" | "no" | "abstain" = "yes"
): Promise<void> {
  const d = await db();
  await d.insert(voteBallots).values({ voteId, userId, choice, weight: "1" });
}

export async function createResolution(
  organizationId: number,
  createdBy: number,
  overrides: Partial<typeof resolutions.$inferInsert> = {}
): Promise<Resolution> {
  const d = await db();
  const res = await d.insert(resolutions).values({
    organizationId,
    title: `Resolution ${uniq()}`,
    status: "draft",
    requiresSignature: true,
    createdBy,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(resolutions).where(eq(resolutions.id, id)).limit(1);
  return row[0];
}

export async function createDocument(
  organizationId: number,
  uploadedBy: number,
  overrides: Partial<typeof documents.$inferInsert> = {}
): Promise<Document> {
  const d = await db();
  const key = uniq();
  const res = await d.insert(documents).values({
    organizationId,
    title: `Document ${key}`,
    fileKey: `org-${organizationId}/documents/${key}.pdf`,
    fileUrl: `https://example.test/org-${organizationId}/${key}.pdf`,
    mimeType: "application/pdf",
    fileSize: 1024,
    documentType: "boardPack",
    uploadedBy,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(documents).where(eq(documents.id, id)).limit(1);
  return row[0];
}

export async function createSubscriptionPlan(
  overrides: Partial<typeof subscriptionPlans.$inferInsert> = {}
) {
  const d = await db();
  const res = await d.insert(subscriptionPlans).values({
    name: `Plan ${uniq()}`,
    slug: `plan-${uniq()}`,
    monthlyPrice: "0",
    isActive: true,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return row[0];
}

export async function createOrganizationSubscription(
  organizationId: number,
  planId: number,
  overrides: Partial<typeof organizationSubscriptions.$inferInsert> = {}
) {
  const d = await db();
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const res = await d.insert(organizationSubscriptions).values({
    organizationId,
    planId,
    status: "active",
    billingCycle: "monthly",
    currentPeriodStart: now,
    currentPeriodEnd: end,
    storageUsed: 0,
    storageLimit: 5 * 1024 * 1024 * 1024,
    ...overrides,
  });
  const id = (res as any)[0].insertId as number;
  const row = await d
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.id, id))
    .limit(1);
  return row[0];
}
