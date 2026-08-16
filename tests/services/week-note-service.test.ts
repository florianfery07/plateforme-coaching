import { describe, expect, it, vi } from "vitest";

import {
  createWeekNoteService,
  loadWeekNotes,
  mapWeekNotes,
  mapWeekNotePersistenceError,
  validateWeekNotePayload,
} from "../../src/services/week-notes/week-note-service";
import type {
  WeekNoteReadRepository,
  WeekNoteRow,
  WeekNotePayload,
  WeekNoteRepository,
} from "../../src/services/week-notes/types";

const payload: WeekNotePayload = {
  athleteId: "athlete-1",
  note: "draft",
  week: "S12",
  year: 2026,
};

function repository(result: Awaited<ReturnType<WeekNoteRepository["upsert"]>>): WeekNoteRepository {
  return { upsert: vi.fn().mockResolvedValue(result) };
}

function noteRow(overrides: Partial<WeekNoteRow> = {}): WeekNoteRow {
  return {
    id: "note-1",
    athlete_id: "athlete-1",
    year: 2026,
    week: "S12",
    note: "Build steadily.",
    created_at: "2026-08-12T10:00:00.000Z",
    updated_at: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

function readRepository(
  result: Awaited<ReturnType<WeekNoteReadRepository["list"]>>,
): WeekNoteReadRepository {
  return { list: vi.fn().mockResolvedValue(result) };
}

describe("week note service", () => {
  it("saves one explicit single-table weekly-note payload", async () => {
    const source = repository({
      data: { ...payload, updatedAt: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    const signal = new AbortController().signal;

    const result = await createWeekNoteService(source).save(payload, signal);

    expect(result).toEqual({ ...payload, updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(source.upsert).toHaveBeenCalledWith(payload, signal);
  });

  it("rejects an invalid key before persistence", async () => {
    const source = repository({ data: null, error: null });

    await expect(createWeekNoteService(source).save({ ...payload, week: "" })).rejects.toMatchObject({
      kind: "validation",
    });
    expect(source.upsert).not.toHaveBeenCalled();
  });

  it("keeps an empty note valid", () => {
    expect(validateWeekNotePayload({ ...payload, note: "" })).toBeNull();
  });

  it("maps permission and conflict errors without exposing persistence details", () => {
    expect(mapWeekNotePersistenceError({ code: "42501" })).toMatchObject({
      kind: "permission",
      message: "You do not have permission to save this note.",
    });
    expect(mapWeekNotePersistenceError({ code: "23505" })).toMatchObject({
      kind: "conflict",
      message: "The note changed before it could be saved.",
    });
  });

  it("maps network failures as explicitly retryable", () => {
    expect(mapWeekNotePersistenceError(new TypeError("network internals"))).toMatchObject({
      kind: "network",
      retryable: true,
    });
  });

  it("maps constraint and unknown failures without raw provider text", async () => {
    const validationSource = repository({ data: null, error: { code: "23514" } });
    await expect(createWeekNoteService(validationSource).save(payload)).rejects.toMatchObject({
      kind: "validation",
      message: "The note information is invalid.",
    });

    const unknownSource = repository({ data: null, error: { code: "unexpected", status: 500 } });
    await expect(createWeekNoteService(unknownSource).save(payload)).rejects.toMatchObject({
      kind: "unknown",
      message: "The note could not be saved.",
    });
  });

  it("uses injected persistence only, without a network request in tests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const source = repository({ data: { ...payload, updatedAt: null }, error: null });

    await createWeekNoteService(source).save(payload);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps the legacy empty note result when no rows are returned", () => {
    expect(mapWeekNotes(null)).toEqual({});
  });

  it("maps notes by their exact legacy athlete, year, and week key", () => {
    const rows = [
      noteRow({ athlete_id: "athlete-1", year: 2025, week: "S52" }),
      noteRow({ athlete_id: "athlete-1", year: 2026, week: "S12" }),
      noteRow({ athlete_id: "athlete-2", year: 2026, week: "S12" }),
    ];

    expect(mapWeekNotes(rows)).toEqual({
      "athlete-1-2025-S52": "Build steadily.",
      "athlete-1-2026-S12": "Build steadily.",
      "athlete-2-2026-S12": "Build steadily.",
    });
  });

  it("preserves legacy empty and null note defaults", () => {
    expect(mapWeekNotes([
      noteRow({ week: "S12", note: "" }),
      noteRow({ week: "S13", note: null }),
    ])).toEqual({
      "athlete-1-2026-S12": "",
      "athlete-1-2026-S13": "",
    });
  });

  it("preserves the legacy duplicate behavior, where the final row wins", () => {
    const rows = [
      noteRow({ id: "note-old", note: "Old" }),
      noteRow({ id: "note-new", note: "New" }),
    ];

    expect(mapWeekNotes(rows)["athlete-1-2026-S12"]).toBe("New");
    expect(rows.map((row) => row.id)).toEqual(["note-old", "note-new"]);
  });

  it("returns a read error without preparing partial notes", async () => {
    const source = readRepository({ data: null, error: { message: "unavailable" } });

    await expect(loadWeekNotes(source)).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("keeps read and write contracts together without invoking persistence during a read", async () => {
    const writes = repository({ data: { ...payload, updatedAt: null }, error: null });
    const reads = readRepository({ data: [noteRow()], error: null });
    const source: WeekNoteRepository & WeekNoteReadRepository = { ...reads, ...writes };

    await expect(loadWeekNotes(source)).resolves.toEqual({
      kind: "success",
      notes: { "athlete-1-2026-S12": "Build steadily." },
    });
    expect(source.list).toHaveBeenCalledOnce();
    expect(source.upsert).not.toHaveBeenCalled();
  });
});
