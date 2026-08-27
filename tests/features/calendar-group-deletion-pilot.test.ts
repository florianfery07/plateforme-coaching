import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const legacyApiSource = readFileSync(resolve(process.cwd(), "src/lib/api/RroupCalendar.ts"), "utf8");
const memberStart = source.indexOf("async function deleteAthleteWorkoutFromGroupDay");
const memberPilotStart = source.indexOf("if (calendarGroupDeletePilotEnabled) {", memberStart);
const memberLegacyStart = source.indexOf("const result = await deleteAthleteWorkoutFromGroupDayApi", memberPilotStart);
const groupDayStart = source.indexOf("async function deleteGroupDayWorkouts");
const groupDayPilotStart = source.indexOf("if (calendarGroupDeletePilotEnabled) {", groupDayStart);
const groupDayLegacyStart = source.indexOf("const result = await deleteGroupDayWorkoutsApi", groupDayPilotStart);

describe("calendar group deletion reliable mutation pilot", () => {
  it("reuses the existing local-only flag and calendar service for both reachable group deletions", () => {
    expect(source).toContain("const calendarGroupDeletePilotEnabled = isReliableMutationsPilotEnabled()");
    expect(source).toContain('key: "calendar-session.group-member.delete"');
    expect(source).toContain('key: "calendar-session.group-day.delete"');
    expect(source).toContain('type: "calendar-session.group-member.delete"');
    expect(source).toContain('type: "calendar-session.group-day.delete"');
    expect(source).toContain('concurrency: "reject"');
    expect(source).toContain("calendarSessionService.remove({ workoutIds }, context.signal)");
  });

  it("removes only confirmed local sessions and never explicitly deletes feedbacks in the pilot", () => {
    const memberPilot = source.slice(memberPilotStart, memberLegacyStart);
    const groupDayPilot = source.slice(groupDayPilotStart, groupDayLegacyStart);

    expect(memberPilot).toContain('if (result.state === "success" && result.data) {');
    expect(groupDayPilot).toContain('if (result.state === "success" && result.data) {');
    expect(memberPilot).toContain("setSessions((items) => Object.fromEntries(");
    expect(groupDayPilot).toContain("const workoutIdsToRemove = new Set(result.data)");
    expect(memberPilot).toContain('alert("Impossible de retirer cette séance. Réessaie.")');
    expect(groupDayPilot).toContain('alert("Impossible de retirer les séances du groupe. Réessaie.")');
    expect(memberPilot).not.toContain("loadAllData");
    expect(groupDayPilot).not.toContain("loadAllData");
    expect(memberPilot).not.toContain("workout_feedbacks");
    expect(groupDayPilot).not.toContain("workout_feedbacks");
    expect(memberPilot).not.toContain("delete_group_session_v2");
    expect(groupDayPilot).not.toContain("delete_group_session_v2");
  });

  it("keeps the two legacy multi-write paths intact when the pilot is disabled", () => {
    expect(memberLegacyStart).toBeGreaterThan(memberPilotStart);
    expect(groupDayLegacyStart).toBeGreaterThan(groupDayPilotStart);
    expect(source.slice(memberLegacyStart)).toContain("await loadAllData()");
    expect(source.slice(groupDayLegacyStart)).toContain("await loadAllData()");
    expect(legacyApiSource).toContain('.from("workout_feedbacks")');
  });
});
