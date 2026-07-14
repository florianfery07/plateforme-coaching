import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createDebouncedMutation, type MutationError } from "../services/mutations";
import type {
  WeekNoteAutosaveState,
  WeekNoteService,
} from "../services/week-notes";
import { useReliableMutation } from "./use-reliable-mutation";

export const WEEK_NOTE_DEBOUNCE_MS = 500;
const WEEK_NOTE_TIMEOUT_MS = 10_000;
const WEEK_NOTE_RETRY_DELAY_MS = 500;

type WeekNoteAutosaveDiagnostic = {
  attempts?: number;
  errorKind?: MutationError["kind"];
  event: "started" | "success" | "error" | "timeout" | "retry" | "superseded" | "cancelled";
  path: "legacy" | "v2";
};

type UseWeekNoteAutosaveOptions = {
  enabled: boolean;
  legacySave: (note: string) => void | Promise<void>;
  service: WeekNoteService;
  athleteId: string;
  week: string;
  year: number;
};

const initialState: WeekNoteAutosaveState = {
  error: null,
  state: "idle",
};

function stateFromError(error: MutationError | null): WeekNoteAutosaveState {
  return { error, state: "error" };
}

export function createWeekNoteAutosaveDiagnostic(
  environment = process.env.NODE_ENV,
): (diagnostic: WeekNoteAutosaveDiagnostic) => void {
  return (diagnostic) => {
    if (environment !== "development") return;
    console.info("[week-note-autosave]", diagnostic);
  };
}

/** Pilot-only adapter: it preserves the local draft and delegates persistence to L08a. */
export function useWeekNoteAutosave({
  athleteId,
  enabled,
  legacySave,
  service,
  week,
  year,
}: UseWeekNoteAutosaveOptions) {
  const key = `${athleteId}:${year}:${week}`;
  const resource = useMemo(() => ({ key }), [key]);
  const [state, setState] = useState({ resource: null as object | null, value: initialState });
  const [lastNote, setLastNote] = useState({ resource: null as object | null, value: null as string | null });
  const requestVersionRef = useRef(0);
  const debouncedRef = useRef<ReturnType<typeof createDebouncedMutation<string, void>> | null>(null);
  const diagnostic = useMemo(() => createWeekNoteAutosaveDiagnostic(), []);

  const mutationOptions = useMemo(() => ({
    concurrency: "serial" as const,
    key: `week-note:${key}`,
    latestWins: true,
    operation: async (note: string, context: { signal: AbortSignal }) => {
      await service.save({ athleteId, note, week, year }, context.signal);
    },
    retry: {
      attempts: 2,
      delayMs: WEEK_NOTE_RETRY_DELAY_MS,
      shouldRetry: (error: MutationError) => error.kind === "network",
    },
    timeoutMs: WEEK_NOTE_TIMEOUT_MS,
    type: "week-note.autosave",
  }), [athleteId, key, service, week, year]);
  const reliableMutation = useReliableMutation(mutationOptions);

  useEffect(() => {
    if (!enabled) return;

    const debounced = createDebouncedMutation({
      delayMs: WEEK_NOTE_DEBOUNCE_MS,
      run: reliableMutation.mutate,
    });
    debouncedRef.current = debounced;

    return () => {
      debounced.cancel();
      if (debouncedRef.current === debounced) debouncedRef.current = null;
    };
  }, [enabled, reliableMutation.mutate]);

  const save = useCallback((note: string) => {
    setLastNote({ resource, value: note });

    if (!enabled) {
      diagnostic({ event: "started", path: "legacy" });
      void Promise.resolve(legacySave(note)).then(
        () => diagnostic({ event: "success", path: "legacy" }),
        () => diagnostic({ event: "error", path: "legacy" }),
      );
      return;
    }

    const debounced = debouncedRef.current;
    if (!debounced) return;

    const requestVersion = ++requestVersionRef.current;
    setState({ resource, value: { error: null, state: "pending" } });
    diagnostic({ event: "started", path: "v2" });
    void debounced.schedule(note).then((result) => {
      if (requestVersion !== requestVersionRef.current) return;
      if (result.attempts > 1) {
        diagnostic({ attempts: result.attempts, event: "retry", path: "v2" });
      }
      if (result.state === "success") {
        diagnostic({ event: "success", path: "v2" });
        setState({ resource, value: { error: null, state: "success" } });
      } else if (result.state === "error") {
        diagnostic({
          errorKind: result.error?.kind,
          event: result.error?.kind === "timeout" ? "timeout" : "error",
          path: "v2",
        });
        setState({ resource, value: stateFromError(result.error) });
      } else if (result.state === "cancelled") {
        diagnostic({ event: "cancelled", path: "v2" });
        setState({ resource, value: initialState });
      } else if (result.state === "superseded") {
        diagnostic({ event: "superseded", path: "v2" });
      }
    });
  }, [diagnostic, enabled, legacySave, resource]);

  const flush = useCallback(() => {
    void debouncedRef.current?.flush();
  }, []);

  const retry = useCallback(() => {
    if (lastNote.resource === resource && lastNote.value !== null) {
      save(lastNote.value);
    }
  }, [lastNote, resource, save]);

  const visibleState = state.resource === resource ? state.value : initialState;
  const visibleLastNote = lastNote.resource === resource ? lastNote.value : null;

  return {
    flush,
    lastNote: visibleLastNote,
    retry,
    save,
    state: enabled ? visibleState : initialState,
  };
}
