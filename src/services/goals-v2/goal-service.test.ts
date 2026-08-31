import { describe, expect, it } from "vitest";

import { createGoalsV2Service, shouldUseGoalsV2 } from "./goal-service";
import type { GoalsV2Repository } from "./types";

const athleteId = "10000000-0000-4000-8000-000000000011";
const requestId = "20000000-0000-4000-8000-000000000011";
const versionId = "30000000-0000-4000-8000-000000000011";
const idempotencyKey = "40000000-0000-4000-8000-000000000011";

function repository(overrides: Partial<GoalsV2Repository> = {}): GoalsV2Repository {
  const success = async () => ({ data: { requestId, status: "requested", changed: true }, error: null });
  return {
    open: success,
    cancel: success,
    submit: async () => ({ data: { requestId, versionId, revisionNumber: 1, status: "submitted", changed: true }, error: null }),
    accept: success,
    requestChanges: success,
    getCurrent: async () => ({ data: { legacyAthleteId: athleteId, current: null }, error: null }),
    getState: async () => ({ data: { legacyAthleteId: athleteId, current: null, openRequest: null, history: [] }, error: null }),
    listHistory: async () => ({ data: [], error: null }),
    ...overrides,
  };
}

describe("Goals V2 service", () => {
  it("selects V2 only for an enabled server-confirmed pilot", () => {
    expect(shouldUseGoalsV2(null, true)).toBe(false);
    expect(shouldUseGoalsV2({
      userId: athleteId,
      accountStatus: "active",
      isPilot: false,
      isPlatformAdministrator: false,
      memberships: [],
      athletePermissions: [],
    }, true)).toBe(false);
    expect(shouldUseGoalsV2({
      userId: athleteId,
      accountStatus: "active",
      isPilot: true,
      isPlatformAdministrator: false,
      memberships: [],
      athletePermissions: [],
    }, true)).toBe(true);
    expect(shouldUseGoalsV2({
      userId: athleteId,
      accountStatus: "active",
      isPilot: true,
      isPlatformAdministrator: false,
      memberships: [],
      athletePermissions: [],
    }, false)).toBe(false);
  });

  it("validates idempotent inputs before calling the repository", async () => {
    const service = createGoalsV2Service(repository());

    await expect(service.open({ legacyAthleteId: "invalid", idempotencyKey })).rejects.toThrow("athlète sélectionné");
    await expect(service.submit({ requestId, idempotencyKey, shortGoal: " ", mediumGoal: null, longGoal: "" })).rejects.toThrow("au moins un objectif");
    await expect(service.requestChanges({ requestId, reviewNote: " " })).rejects.toThrow("Expliquez");
  });

  it("returns controlled RPC results and preserves the requested operation", async () => {
    const calls: string[] = [];
    const service = createGoalsV2Service(repository({
      open: async () => {
        calls.push("open");
        return { data: { requestId, status: "requested", changed: true }, error: null };
      },
      submit: async () => {
        calls.push("submit");
        return { data: { requestId, versionId, revisionNumber: 1, status: "submitted", changed: true }, error: null };
      },
    }));

    await expect(service.open({ legacyAthleteId: athleteId, idempotencyKey })).resolves.toEqual({ requestId, status: "requested", changed: true });
    await expect(service.submit({ requestId, idempotencyKey, shortGoal: "Court" })).resolves.toEqual({ requestId, versionId, revisionNumber: 1, status: "submitted", changed: true });
    expect(calls).toEqual(["open", "submit"]);
  });

  it("maps malformed or sensitive server failures to safe client errors", async () => {
    const service = createGoalsV2Service(repository({
      open: async () => ({ data: null, error: { message: "athlete_goal_permission_denied" } }),
      listHistory: async () => ({ data: { internal: "unexpected" }, error: null }),
    }));

    await expect(service.open({ legacyAthleteId: athleteId, idempotencyKey })).rejects.toThrow("n’êtes pas autorisé");
    await expect(service.listHistory(athleteId)).rejects.toThrow("réponse Objectifs V2 est invalide");
  });

  it("maps only a structurally valid current goal and immutable history", async () => {
    const service = createGoalsV2Service(repository({
      getCurrent: async () => ({
        data: { legacyAthleteId: athleteId, current: { versionId, requestId, revisionNumber: 2, source: "athlete_submission", shortGoal: "Court", mediumGoal: null, longGoal: "Long", acceptedAt: "2026-08-30T10:00:00Z" } },
        error: null,
      }),
      listHistory: async () => ({
        data: [{ versionId, requestId, requestStatus: "accepted", revisionNumber: 2, source: "athlete_submission", shortGoal: "Court", mediumGoal: null, longGoal: "Long", submittedAt: "2026-08-30T09:00:00Z", reviewOutcome: "accepted", reviewedAt: "2026-08-30T10:00:00Z", reviewNote: null }],
        error: null,
      }),
    }));

    await expect(service.getCurrent(athleteId)).resolves.toMatchObject({ versionId, source: "athlete_submission", shortGoal: "Court" });
    await expect(service.listHistory(athleteId)).resolves.toHaveLength(1);
  });

  it("reads one validated UI state including a request without a submitted version", async () => {
    const service = createGoalsV2Service(repository({
      getState: async () => ({
        data: {
          legacyAthleteId: athleteId,
          current: null,
          openRequest: {
            requestId,
            status: "requested",
            reviewNote: null,
            requestedAt: "2026-08-30T10:00:00Z",
            updatedAt: "2026-08-30T10:00:00Z",
            latestVersion: null,
          },
          history: [],
        },
        error: null,
      }),
    }));

    await expect(service.getState(athleteId)).resolves.toMatchObject({
      legacyAthleteId: athleteId,
      openRequest: { requestId, status: "requested", latestVersion: null },
      history: [],
    });
  });
});
