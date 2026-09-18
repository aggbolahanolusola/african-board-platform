/**
 * Local development seed.
 *
 *   pnpm db:seed
 *
 * Creates two demo organizations, a user for every role, plus meetings,
 * agendas, votes, resolutions and documents so the app has something to show.
 * Re-running clears the previously seeded demo data first (idempotent).
 *
 * Demo logins (all verified, password: DemoPass123!):
 *   admin@nurtgov.test        administrator   (Acme Holdings)
 *   secretary@nurtgov.test    secretary       (Acme Holdings)
 *   board@nurtgov.test        boardMember     (Acme Holdings)
 *   compliance@nurtgov.test   complianceOfficer (Acme Holdings)
 *   admin-b@nurtgov.test      administrator   (Beta Ventures)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import { getDb } from "../server/db";
import {
  organizations,
  users,
  meetings,
  agendas,
  votes,
  resolutions,
  documents,
  subscriptionPlans,
  organizationSubscriptions,
} from "../drizzle/schema";

const DEMO_EMAILS = [
  "admin@nurtgov.test",
  "secretary@nurtgov.test",
  "board@nurtgov.test",
  "compliance@nurtgov.test",
  "admin-b@nurtgov.test",
];
const PLAN_SLUGS = ["starter", "professional", "enterprise"];

async function insertReturningId(db: any, table: any, values: any): Promise<number> {
  const res = await db.insert(table).values(values);
  return (res as any)[0].insertId as number;
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set or the database is unreachable.");

  console.log("[seed] Clearing previous demo data...");
  // Remove demo users (and let new orgs be created fresh).
  await db.delete(users).where(inArray(users.email, DEMO_EMAILS));

  console.log("[seed] Subscription plans...");
  const existingPlans = await db
    .select()
    .from(subscriptionPlans)
    .where(inArray(subscriptionPlans.slug, PLAN_SLUGS));
  if (existingPlans.length === 0) {
    await db.insert(subscriptionPlans).values([
      { name: "Starter", slug: "starter", monthlyPrice: "0", yearlyPrice: "0", maxUsers: 5, maxMeetings: 10, maxDocuments: 50, maxStorage: 1, priority: 1, isActive: true },
      { name: "Professional", slug: "professional", monthlyPrice: "49", yearlyPrice: "490", maxUsers: 25, maxMeetings: 100, maxDocuments: 500, maxStorage: 10, priority: 2, isActive: true },
      { name: "Enterprise", slug: "enterprise", monthlyPrice: "199", yearlyPrice: "1990", maxUsers: 1000, maxMeetings: 10000, maxDocuments: 100000, maxStorage: 100, priority: 3, isActive: true },
    ]);
  }
  const proPlan = (
    await db.select().from(subscriptionPlans).where(inArray(subscriptionPlans.slug, ["professional"]))
  )[0];

  console.log("[seed] Organizations...");
  const acmeId = await insertReturningId(db, organizations, {
    name: "Acme Holdings (Demo)",
    country: "Nigeria",
    timezone: "Africa/Lagos",
  });
  const betaId = await insertReturningId(db, organizations, {
    name: "Beta Ventures (Demo)",
    country: "South Africa",
    timezone: "Africa/Johannesburg",
  });

  console.log("[seed] Subscription for Acme...");
  const now = new Date();
  await db.insert(organizationSubscriptions).values({
    organizationId: acmeId,
    planId: proPlan.id,
    status: "active",
    billingCycle: "monthly",
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    storageUsed: 0,
    storageLimit: 10 * 1024 * 1024 * 1024,
  });

  console.log("[seed] Users...");
  const passwordHash = await bcrypt.hash("DemoPass123!", 10);
  const mkUser = (email: string, name: string, organizationId: number, userRole: any) => ({
    openId: `demo_${email}`,
    name,
    email,
    loginMethod: "email" as const,
    passwordHash,
    isEmailVerified: true,
    role: "user" as const,
    organizationId,
    userRole,
  });
  const adminId = await insertReturningId(db, users, mkUser("admin@nurtgov.test", "Ada Admin", acmeId, "administrator"));
  await insertReturningId(db, users, mkUser("secretary@nurtgov.test", "Sam Secretary", acmeId, "secretary"));
  await insertReturningId(db, users, mkUser("board@nurtgov.test", "Bola Board", acmeId, "boardMember"));
  await insertReturningId(db, users, mkUser("compliance@nurtgov.test", "Chidi Compliance", acmeId, "complianceOfficer"));
  await insertReturningId(db, users, mkUser("admin-b@nurtgov.test", "Beth Admin", betaId, "administrator"));

  console.log("[seed] Meetings, agendas, votes, resolutions, documents...");
  const meetingId = await insertReturningId(db, meetings, {
    organizationId: acmeId,
    title: "Q2 Board Meeting",
    description: "Quarterly review and strategy.",
    scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    timezone: "Africa/Lagos",
    meetingType: "board",
    status: "scheduled",
    createdBy: adminId,
  });
  await db.insert(agendas).values([
    { meetingId, title: "Apologies & quorum", orderIndex: 0, duration: 5, status: "pending" },
    { meetingId, title: "Approve previous minutes", orderIndex: 1, duration: 10, status: "pending" },
    { meetingId, title: "CEO report", orderIndex: 2, duration: 20, status: "pending" },
  ]);
  await db.insert(votes).values({
    organizationId: acmeId,
    meetingId,
    title: "Approve FY budget",
    description: "Resolution to approve the annual budget.",
    votingMethod: "majority",
    status: "open",
    result: "pending",
    createdBy: adminId,
  });
  await db.insert(resolutions).values({
    organizationId: acmeId,
    meetingId,
    title: "Appoint external auditor",
    description: "Resolution to appoint the external auditor for the year.",
    status: "draft",
    requiresSignature: true,
    createdBy: adminId,
  });
  await db.insert(documents).values({
    organizationId: acmeId,
    meetingId,
    title: "Q2 Board Pack",
    description: "Pre-read materials for the Q2 board meeting.",
    fileKey: `org-${acmeId}/documents/demo-board-pack.pdf`,
    fileUrl: "https://example.test/demo-board-pack.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    documentType: "boardPack",
    uploadedBy: adminId,
  });

  console.log("[seed] Done. Demo password: DemoPass123!");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
