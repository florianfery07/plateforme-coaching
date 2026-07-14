import type { MutationError } from "../mutations";

import type {
  WeekNotePayload,
  WeekNotePersistenceError,
  WeekNoteRepository,
  WeekNoteService,
} from "./types";

const errorMessages: Record<MutationError["kind"], string> = {
  conflict: "The note changed before it could be saved.",
  network: "The note could not reach the service.",
  permission: "You do not have permission to save this note.",
  timeout: "The note took too long to save.",
  unknown: "The note could not be saved.",
  validation: "The note information is invalid.",
};

function mutationError(
  kind: MutationError["kind"],
  retryable = false,
): MutationError {
  return { kind, message: errorMessages[kind], retryable };
}

export function mapWeekNotePersistenceError(
  error: WeekNotePersistenceError | unknown,
): MutationError {
  const candidate = error as WeekNotePersistenceError | null;
  const code = candidate?.code;
  const status = candidate?.status;

  if (code === "42501" || status === 401 || status === 403) {
    return mutationError("permission");
  }
  if (code === "23505") {
    return mutationError("conflict");
  }
  if (code === "23514" || status === 400) {
    return mutationError("validation");
  }
  if (error instanceof TypeError) {
    return mutationError("network", true);
  }

  return mutationError("unknown");
}

export function validateWeekNotePayload(
  payload: WeekNotePayload,
): MutationError | null {
  if (
    typeof payload.athleteId !== "string" ||
    payload.athleteId.trim() === "" ||
    !Number.isInteger(payload.year) ||
    typeof payload.week !== "string" ||
    payload.week.trim() === "" ||
    typeof payload.note !== "string"
  ) {
    return mutationError("validation");
  }

  return null;
}

export function createWeekNoteService(
  repository: WeekNoteRepository,
): WeekNoteService {
  return {
    async save(payload, signal) {
      const validationError = validateWeekNotePayload(payload);
      if (validationError) throw validationError;

      try {
        const { data, error } = await repository.upsert(payload, signal);
        if (error) throw mapWeekNotePersistenceError(error);
        if (!data) throw mutationError("unknown");
        return data;
      } catch (error) {
        if (typeof error === "object" && error !== null && "kind" in error) {
          throw error;
        }
        throw mapWeekNotePersistenceError(error);
      }
    },
  };
}
