/**
 * Security regression tests for cross-organization access (IDOR).
 *
 * These prove the fixes applied in the May 2026 review: a user in organization
 * B must never be able to read, mutate, or delete organization A's resources,
 * and a client-supplied `organizationId` must be ignored in favour of the
 * authenticated session's organization.
 *
 * Requires a reachable test database; the suite self-skips otherwise.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import "../env";
import { resetTestDb } from "../db";
import { callerFor } from "../caller";
import {
  createOrganization,
  createUser,
  createMeeting,
  createVote,
  createDocument,
} from "../factories";
import { getDb } from "../../db";
import { documents } from "../../../drizzle/schema";
import type { User, Meeting, Vote, Document } from "../../../drizzle/schema";

// Synchronous gate: run when a database is configured, skip otherwise. The
// harness (setup.ts) migrates the DB before these run; a misconfigured but
// non-reachable DATABASE_URL will surface as a clear error in beforeEach.
const dbConfigured = !!process.env.DATABASE_URL;
const suite = dbConfigured ? describe : describe.skip;

suite("Security: cross-organization access (IDOR)", () => {
  let userA: User;
  let userB: User;
  let meetingA: Meeting;
  let voteA: Vote;
  let docA: Document;
  let orgBId: number;

  beforeEach(async () => {
    await resetTestDb();
    const orgA = await createOrganization();
    const orgB = await createOrganization();
    orgBId = orgB.id;
    userA = await createUser({ organizationId: orgA.id, userRole: "administrator" });
    userB = await createUser({ organizationId: orgB.id, userRole: "administrator" });
    meetingA = await createMeeting(orgA.id, userA.id);
    voteA = await createVote(orgA.id, userA.id);
    docA = await createDocument(orgA.id, userA.id);
  });

  it("lets a user read a meeting in their own organization", async () => {
    const meeting = await callerFor(userA).meeting.getById({ meetingId: meetingA.id });
    expect(meeting.id).toBe(meetingA.id);
  });

  it("blocks reading another organization's meeting (meeting.getById)", async () => {
    await expect(
      callerFor(userB).meeting.getById({ meetingId: meetingA.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("blocks reading another organization's vote (voting.getVote)", async () => {
    await expect(
      callerFor(userB).voting.getVote({ voteId: voteA.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("blocks casting a ballot on another organization's vote (voting.castVote)", async () => {
    await expect(
      callerFor(userB).voting.castVote({ voteId: voteA.id, choice: "yes", weight: 1 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("blocks closing another organization's vote (voting.closeVote)", async () => {
    await expect(
      callerFor(userB).voting.closeVote({ voteId: voteA.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ignores a client-supplied organizationId when creating a vote", async () => {
    // userA forges organizationId = orgB while creating a vote.
    await callerFor(userA).voting.createVote({
      organizationId: orgBId,
      title: "Injected vote",
      votingMethod: "majority",
    });

    const aVotes = await callerFor(userA).voting.getVotes({});
    const bVotes = await callerFor(userB).voting.getVotes({});

    // The vote belongs to userA's real org, never to the forged orgB.
    expect(aVotes.votes.some(v => v.title === "Injected vote")).toBe(true);
    expect(bVotes.votes.some(v => v.title === "Injected vote")).toBe(false);
  });

  it("blocks deleting another organization's document and leaves it intact", async () => {
    await expect(
      callerFor(userB).documents.delete({ documentId: docA.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const db = await getDb();
    const remaining = await db!
      .select()
      .from(documents)
      .where(eq(documents.id, docA.id));
    expect(remaining.length).toBe(1);
  });

  it("lets the owning organization delete its own document", async () => {
    const result = await callerFor(userA).documents.delete({ documentId: docA.id });
    expect(result.success).toBe(true);
  });
});
