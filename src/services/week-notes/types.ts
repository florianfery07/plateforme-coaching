import type { MutationError } from "../mutations";

export type WeekNotePayload = {
  athleteId: string;
  note: string;
  week: string;
  year: number;
};

export type WeekNoteRecord = WeekNotePayload & {
  updatedAt: string | null;
};

export type WeekNotePersistenceError = {
  code?: string | null;
  status?: number | null;
};

export type WeekNoteRepository = {
  upsert: (
    payload: WeekNotePayload,
    signal?: AbortSignal,
  ) => Promise<{
    data: WeekNoteRecord | null;
    error: WeekNotePersistenceError | null;
  }>;
};

export type WeekNoteService = {
  save: (
    payload: WeekNotePayload,
    signal?: AbortSignal,
  ) => Promise<WeekNoteRecord>;
};

export type WeekNoteAutosaveState = {
  error: MutationError | null;
  state: "idle" | "pending" | "success" | "error";
};
