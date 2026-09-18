/**
 * Meeting procedure tests, exercised end-to-end through the tRPC caller against
 * the test database. Self-skips when no database is configured (see TESTBED.md).
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../test/env";
import { resetTestDb } from "../test/db";
import { callerFor } from "../test/caller";
import { createOrganization, createUser, createMeeting } from "../test/factories";
import type { User } from "../../drizzle/schema";

const dbConfigured = !!process.env.DATABASE_URL;
const suite = dbConfigured ? describe : describe.skip;

suite("Meeting procedures", () => {
  let admin: User;
  let orgId: number;

  beforeEach(async () => {
    await resetTestDb();
    const org = await createOrganization();
    orgId = org.id;
    admin = await createUser({ organizationId: org.id, userRole: "administrator" });
  });

  it("creates a meeting scoped to the caller's organization", async () => {
    await callerFor(admin).meeting.create({
      title: "Board Sync",
      scheduledAt: new Date(),
      timezone: "Africa/Lagos",
      meetingType: "board",
    });
    const list = await callerFor(admin).meeting.list();
    expect(list.length).toBe(1);
    expect(list[0].organizationId).toBe(orgId);
  });

  it("reads, updates and deletes a meeting", async () => {
    const m = await createMeeting(orgId, admin.id, { title: "Original" });

    const read = await callerFor(admin).meeting.getById({ meetingId: m.id });
    expect(read.title).toBe("Original");

    await callerFor(admin).meeting.update({ meetingId: m.id, title: "Updated" });
    const afterUpdate = await callerFor(admin).meeting.getById({ meetingId: m.id });
    expect(afterUpdate.title).toBe("Updated");

    await callerFor(admin).meeting.delete({ meetingId: m.id });
    await expect(
      callerFor(admin).meeting.getById({ meetingId: m.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("manages agenda items", async () => {
    const m = await createMeeting(orgId, admin.id);
    await callerFor(admin).meeting.createAgenda({
      meetingId: m.id,
      title: "Apologies & quorum",
      orderIndex: 0,
    });
    const details = await callerFor(admin).meeting.getDetails({ meetingId: m.id });
    expect(details?.agendas.length).toBe(1);
  });

  it("adds and lists participants from the same organization", async () => {
    const m = await createMeeting(orgId, admin.id);
    const member = await createUser({ organizationId: orgId, userRole: "boardMember" });

    await callerFor(admin).meeting.addParticipant({ meetingId: m.id, userId: member.id });
    const participants = await callerFor(admin).meeting.getParticipants({ meetingId: m.id });

    expect(participants.length).toBe(1);
    expect(participants[0].userId).toBe(member.id);
  });

  it("blocks updating a meeting that belongs to another organization", async () => {
    const other = await createOrganization();
    const otherAdmin = await createUser({ organizationId: other.id, userRole: "administrator" });
    const m = await createMeeting(orgId, admin.id);

    await expect(
      callerFor(otherAdmin).meeting.update({ meetingId: m.id, title: "Hijack" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
