import { describe, expect, it } from "vitest";

import { overlapCycleLanes } from "./pilotage-month-utils";

describe("overlapCycleLanes", () => {
  it("assigns separate stable lanes to overlapping cycle intervals", () => {
    const lanes = overlapCycleLanes([
      { id: "general", name: "Préparation générale", startsOn: "2026-09-01", endsOn: "2026-09-21" },
      { id: "power", name: "Développement puissance", startsOn: "2026-09-08", endsOn: "2026-09-28" },
      { id: "technique", name: "Technique CX", startsOn: "2026-09-15", endsOn: "2026-09-24" },
    ], new Date(2026, 8, 1), new Date(2026, 8, 30));

    expect(lanes.map((item) => item.lane)).toEqual([0, 1, 2]);
  });

  it("reuses a lane once a previous cycle has ended", () => {
    const lanes = overlapCycleLanes([
      { id: "first", name: "Premier", startsOn: "2026-09-01", endsOn: "2026-09-07" },
      { id: "second", name: "Second", startsOn: "2026-09-08", endsOn: "2026-09-14" },
    ], new Date(2026, 8, 1), new Date(2026, 8, 30));

    expect(lanes.map((item) => item.lane)).toEqual([0, 0]);
  });
});
