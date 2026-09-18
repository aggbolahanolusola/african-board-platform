/**
 * Voting system tests, exercised end-to-end through the tRPC caller against the
 * test database. Self-skips when no database is configured (see TESTBED.md).
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../test/env";
import { resetTestDb } from "../test/db";
import { callerFor } from "../test/caller";
import { createOrganization, createUser } from "../test/factories";
import type { User } from "../../drizzle/schema";

const dbConfigured = !!process.env.DATABASE_URL;
const suite = dbConfigured ? describe : describe.skip;

suite("Voting system", () => {
  let admin: User;
  let orgId: number;

  beforeEach(async () => {
    await resetTestDb();
    const org = await createOrganization();
    orgId = org.id;
    admin = await createUser({ organizationId: org.id, userRole: "administrator" });
  });

  async function openVote(creator: User = admin) {
    await callerFor(creator).voting.createVote({ title: "Resolution X", votingMethod: "majority" });
    const { votes } = await callerFor(creator).voting.getVotes({});
    return votes[0];
  }

  it("creates a vote in the caller's organization", async () => {
    const v = await openVote();
    expect(v.organizationId).toBe(orgId);
    expect(v.status).toBe("open");
  });

  it("records one ballot per user and prevents double voting", async () => {
    const v = await openVote();
    await callerFor(admin).voting.castVote({ voteId: v.id, choice: "yes", weight: 1 });
    await expect(
      callerFor(admin).voting.castVote({ voteId: v.id, choice: "no", weight: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("tallies a majority vote as passed", async () => {
    const v = await openVote();
    const u2 = await createUser({ organizationId: orgId, userRole: "boardMember" });
    const u3 = await createUser({ organizationId: orgId, userRole: "boardMember" });

    await callerFor(admin).voting.castVote({ voteId: v.id, choice: "yes", weight: 1 });
    await callerFor(u2).voting.castVote({ voteId: v.id, choice: "yes", weight: 1 });
    await callerFor(u3).voting.castVote({ voteId: v.id, choice: "no", weight: 1 });

    const result = await callerFor(admin).voting.closeVote({ voteId: v.id });
    expect(result.result).toBe("passed");
    expect(result.breakdown).toEqual({ yes: 2, no: 1, abstain: 0 });
  });

  it("exposes tallied results via getVote", async () => {
    const v = await openVote();
    await callerFor(admin).voting.castVote({ voteId: v.id, choice: "yes", weight: 1 });

    const detail = await callerFor(admin).voting.getVote({ voteId: v.id });
    expect(detail.stats.yesCount).toBe(1);
    expect(detail.stats.totalVotes).toBe(1);
  });

  it("creates and lists resolutions in the caller's organization", async () => {
    await callerFor(admin).voting.createResolution({ title: "Appoint external auditor" });
    const { resolutions } = await callerFor(admin).voting.getResolutions({});
    expect(resolutions.length).toBe(1);
    expect(resolutions[0].organizationId).toBe(orgId);
  });
});
