import { describe, expect, it, vi } from "vitest";

import type { Database } from "../types/database";
import { createMutationExecutor } from "./mutations";
import {
  calendarProposalsForAthlete,
  calendarProposalsForDate,
  createCalendarProposalSchedulingService,
  loadCalendarProposals,
  type CalendarProposalSchedulingRepository,
  mapCalendarProposals,
  type CalendarProposalsRepository,
} from "./calendar-proposals";

type AthleteProposalRow = Database["public"]["Tables"]["athlete_proposals"]["Row"];

const schedulingProposalId = "13000000-0000-0000-0000-000000000151";
const schedulingWorkoutId = "11000000-0000-0000-0000-000000000151";
const schedulingAthleteId = "10000000-0000-0000-0000-000000000151";

function scheduledPayload(overrides: Record<string, unknown> = {}) {
  return {
    proposalId: schedulingProposalId,
    status: "Programmée",
    created: true,
    workout: {
      id: schedulingWorkoutId,
      athlete_id: schedulingAthleteId,
      date: "2026-08-26",
      workout_type: "Proposition athlète",
      subcategory: "Course à ajouter",
      title: "Course locale",
      duration: "",
      completed: false,
      created_at: "2026-08-26T10:00:00.000Z",
      non_done: false,
      non_done_reason: null,
      non_done_fatigue: null,
      non_done_pain: null,
      non_done_comment: null,
      description: "À ajouter au calendrier.",
      expected_rpe: null,
      blocks: [],
      expected_rpe_global: null,
      expected_specific_duration: "",
      expected_rpe_specific: null,
      adjusted_specific_duration: null,
      athlete_seen_at: null,
      source_proposal_id: schedulingProposalId,
    },
    ...overrides,
  };
}

function schedulingRepository(
  schedule: CalendarProposalSchedulingRepository["schedule"],
): CalendarProposalSchedulingRepository {
  return { schedule };
}

function proposal(overrides: Partial<AthleteProposalRow> = {}): AthleteProposalRow {
  return {
    id: "proposal-1",
    athlete_id: "athlete-1",
    date: "2026-08-12",
    type: "Course à ajouter",
    title: "XCO régional",
    message: "Je souhaite participer.",
    status: "À traiter",
    created_at: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("calendar proposal preparation", () => {
  it("preserves the legacy mapping and hides only refused or scheduled proposals", () => {
    expect(mapCalendarProposals([
      proposal(),
      proposal({ id: "proposal-2", status: "Refusée" }),
      proposal({ id: "proposal-3", status: "Programmée" }),
      proposal({ id: "proposal-4", status: null }),
    ])).toEqual([
      expect.objectContaining({ id: "proposal-1", status: "À traiter" }),
      expect.objectContaining({ id: "proposal-4", status: "À traiter" }),
    ]);
  });

  it("keeps the existing empty result for absent proposal data", () => {
    expect(mapCalendarProposals(null)).toEqual([]);
  });

  it("preserves the descending order already supplied by the legacy query", () => {
    const proposals = mapCalendarProposals([
      proposal({ id: "proposal-new", created_at: "2026-08-12T11:00:00.000Z" }),
      proposal({ id: "proposal-old", created_at: "2026-08-12T10:00:00.000Z" }),
    ]);

    expect(proposals.map(({ id }) => id)).toEqual(["proposal-new", "proposal-old"]);
  });

  it("selects proposals by athlete then by date without mutating the source", () => {
    const proposals = mapCalendarProposals([
      proposal({ id: "proposal-1", athlete_id: "athlete-1", date: "2026-08-12" }),
      proposal({ id: "proposal-2", athlete_id: "athlete-1", date: "2026-08-13" }),
      proposal({ id: "proposal-3", athlete_id: "athlete-2", date: "2026-08-12" }),
    ]);

    const athleteProposals = calendarProposalsForAthlete(proposals, "athlete-1");

    expect(calendarProposalsForDate(athleteProposals, "2026-08-12").map(({ id }) => id)).toEqual(["proposal-1"]);
    expect(proposals.map(({ id }) => id)).toEqual(["proposal-1", "proposal-2", "proposal-3"]);
  });

  it("preserves incomplete nullable fields for the legacy UI", () => {
    expect(mapCalendarProposals([proposal({
      athlete_id: null,
      date: null,
      type: null,
      title: null,
      message: null,
    })])).toEqual([{
      id: "proposal-1",
      athleteId: null,
      date: null,
      type: null,
      title: null,
      message: null,
      status: "À traiter",
    }]);
  });

  it("returns the existing read error without preparing partial data", async () => {
    const repository: CalendarProposalsRepository = {
      list: async () => ({ data: null, error: { message: "unavailable" } }),
    };

    await expect(loadCalendarProposals(repository)).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("loads the same mapped result through the read-only repository boundary", async () => {
    const repository: CalendarProposalsRepository = {
      list: async () => ({ data: [proposal()], error: null }),
    };

    await expect(loadCalendarProposals(repository)).resolves.toEqual({
      kind: "success",
      proposals: [expect.objectContaining({ id: "proposal-1", title: "XCO régional" })],
    });
  });
});

describe("calendar proposal scheduling service", () => {
  it("accepts only the confirmed RPC result and preserves the durable proposal link", async () => {
    const schedule = vi.fn().mockResolvedValue({ data: scheduledPayload(), error: null });
    const service = createCalendarProposalSchedulingService(schedulingRepository(schedule));

    await expect(service.schedule(schedulingProposalId)).resolves.toMatchObject({
      athleteId: schedulingAthleteId,
      created: true,
      proposalId: schedulingProposalId,
      status: "Programmée",
      session: {
        id: schedulingWorkoutId,
        sourceProposalId: schedulingProposalId,
        title: "Course locale",
      },
    });
    expect(schedule).toHaveBeenCalledWith(schedulingProposalId, undefined);
  });

  it("keeps malformed and legacy-ambiguous server results out of local state", async () => {
    const malformed = createCalendarProposalSchedulingService(schedulingRepository(async () => ({
      data: { proposalId: schedulingProposalId, status: "Programmée", created: true },
      error: null,
    })));
    const ambiguous = createCalendarProposalSchedulingService(schedulingRepository(async () => ({
      data: null,
      error: { message: "proposal_schedule_legacy_ambiguous" },
    })));

    await expect(malformed.schedule(schedulingProposalId)).rejects.toMatchObject({ kind: "unknown" });
    await expect(ambiguous.schedule(schedulingProposalId)).rejects.toMatchObject({ kind: "validation" });
  });

  it("rejects an invalid client identifier before making an RPC call", async () => {
    const schedule = vi.fn();
    const service = createCalendarProposalSchedulingService(schedulingRepository(schedule));

    await expect(service.schedule("proposal-legacy")).rejects.toMatchObject({ kind: "validation" });
    expect(schedule).not.toHaveBeenCalled();
  });

  it("submits one RPC operation for a double click while the reliable mutation is pending", async () => {
    let resolveSchedule: ((value: { data: unknown; error: null }) => void) | undefined;
    const schedule = vi.fn(() => new Promise<{ data: unknown; error: null }>((resolve) => {
      resolveSchedule = resolve;
    }));
    const service = createCalendarProposalSchedulingService(schedulingRepository(schedule));
    const executor = createMutationExecutor();
    const options = {
      concurrency: "reject" as const,
      key: "calendar-proposal.schedule",
      operation: ({ proposalId }: { proposalId: string }) => service.schedule(proposalId),
      type: "calendar-proposal.schedule",
    };

    const first = executor.execute({ proposalId: schedulingProposalId }, options);
    const second = await executor.execute({ proposalId: schedulingProposalId }, options);

    expect(second.state).toBe("superseded");
    expect(schedule).toHaveBeenCalledTimes(1);

    resolveSchedule?.({ data: scheduledPayload(), error: null });
    await expect(first).resolves.toMatchObject({ state: "success" });
  });

  it("marks a transport failure retryable without exposing a server detail", async () => {
    const service = createCalendarProposalSchedulingService(schedulingRepository(async () => ({
      data: null,
      error: { message: "Failed to fetch" },
    })));

    await expect(service.schedule(schedulingProposalId)).rejects.toMatchObject({
      kind: "network",
      retryable: true,
    });
  });
});
