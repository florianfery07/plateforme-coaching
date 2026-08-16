import type { MutationError } from "../mutations";
import type { Database } from "../../types/database";

export type WeekNoteRow =
  Database["public"]["Tables"]["athlete_week_notes"]["Row"];

export type WeekNotes = Record<string, string>;

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

export type WeekNoteReadRepository = {
  list: () => Promise<{
    data: WeekNoteRow[] | null;
    error: unknown;
  }>;
};

export type WeekNoteLoadResult =
  | { kind: "success"; notes: WeekNotes }
  | { kind: "error"; error: unknown };

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
