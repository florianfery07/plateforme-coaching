import { describe, expect, it } from "vitest";

import type { Database } from "../types/database";
import {
  calendarProposalsForAthlete,
  calendarProposalsForDate,
  loadCalendarProposals,
  mapCalendarProposals,
  type CalendarProposalsRepository,
} from "./calendar-proposals";

type AthleteProposalRow = Database["public"]["Tables"]["athlete_proposals"]["Row"];

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
