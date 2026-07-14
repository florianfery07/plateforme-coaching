import { describe, expect, it, vi } from "vitest";

import {
  createWeekNoteService,
  mapWeekNotePersistenceError,
  validateWeekNotePayload,
} from "../../src/services/week-notes/week-note-service";
import type {
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
});
