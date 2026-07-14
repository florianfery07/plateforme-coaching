import { act, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  createWeekNoteAutosaveDiagnostic,
  useWeekNoteAutosave,
  WEEK_NOTE_DEBOUNCE_MS,
} from "../../src/hooks/use-week-note-autosave";
import type { WeekNoteService } from "../../src/services/week-notes";

function deferred<Value>() {
  let resolve: (value: Value) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<Value>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject: reject!, resolve: resolve! };
}

function service(save: WeekNoteService["save"]): WeekNoteService {
  return { save };
}

function saved(note: string) {
  return { athleteId: "athlete-1", note, updatedAt: null, week: "S12", year: 2026 };
}

function renderAutosave({
  enabled = true,
  legacySave = vi.fn().mockResolvedValue(undefined),
  save = vi.fn().mockResolvedValue(saved("draft")),
}: {
  enabled?: boolean;
  legacySave?: ReturnType<typeof vi.fn>;
  save?: ReturnType<typeof vi.fn>;
} = {}) {
  const weekNoteService = service(save as WeekNoteService["save"]);
  const hook = renderHook(() => useWeekNoteAutosave({
    athleteId: "athlete-1",
    enabled,
    legacySave: legacySave as (note: string) => void | Promise<void>,
    service: weekNoteService,
    week: "S12",
    year: 2026,
  }));
  return { hook, legacySave, save };
}

describe("weekly note autosave pilot", () => {
  it("uses the untouched legacy writer when the pilot is disabled", async () => {
    const { hook, legacySave, save } = renderAutosave({ enabled: false });

    act(() => hook.result.current.save("legacy draft"));
    await Promise.resolve();

    expect(legacySave).toHaveBeenCalledWith("legacy draft");
    expect(save).not.toHaveBeenCalled();
  });

  it("uses only the reliable service when the pilot is enabled", async () => {
    vi.useFakeTimers();
    const { hook, legacySave, save } = renderAutosave();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    act(() => hook.result.current.save("pilot draft"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ note: "pilot draft", week: "S12" });
    expect(legacySave).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it("debounces rapid typing to the final text", async () => {
    vi.useFakeTimers();
    const { hook, save } = renderAutosave();

    act(() => {
      hook.result.current.save("a");
      hook.result.current.save("ab");
      hook.result.current.save("abc");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].note).toBe("abc");
    vi.useRealTimers();
  });

  it("flushes the final draft on blur without waiting for debounce", async () => {
    vi.useFakeTimers();
    const { hook, save } = renderAutosave();

    act(() => {
      hook.result.current.save("blur draft");
      hook.result.current.flush();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].note).toBe("blur draft");
    vi.useRealTimers();
  });

  it("keeps the newest intent while an older save resolves late", async () => {
    vi.useFakeTimers();
    const first = deferred<ReturnType<typeof saved>>();
    const second = deferred<ReturnType<typeof saved>>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { hook } = renderAutosave({ save });

    act(() => hook.result.current.save("first"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });
    act(() => hook.result.current.save("second"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });

    first.resolve(saved("first"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.state.state).toBe("pending");

    second.resolve(saved("second"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.state).toMatchObject({ error: null, state: "success" });
    vi.useRealTimers();
  });

  it("keeps the local draft after a network error", async () => {
    vi.useFakeTimers();
    const { hook, save } = renderAutosave({ save: vi.fn().mockRejectedValue(new TypeError("offline")) });

    act(() => hook.result.current.save("keep this draft"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS + 500);
    });

    expect(hook.result.current.lastNote).toBe("keep this draft");
    expect(hook.result.current.state.error).toMatchObject({ kind: "network" });
    expect(save).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry a permission error", async () => {
    vi.useFakeTimers();
    const permission = { kind: "permission" as const, message: "no", retryable: false };
    const { hook, save } = renderAutosave({ save: vi.fn().mockRejectedValue(permission) });

    act(() => hook.result.current.save("draft"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS + 1_000);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.error).toMatchObject({ kind: "permission" });
    vi.useRealTimers();
  });

  it("retries a transient failure once and confirms success", async () => {
    vi.useFakeTimers();
    const save = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(saved("recovered"));
    const { hook } = renderAutosave({ save });

    act(() => hook.result.current.save("recovered"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS + 500);
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.state).toBe("success");
    vi.useRealTimers();
  });

  it("supports a manual retry using the retained draft", async () => {
    vi.useFakeTimers();
    const save = vi.fn()
      .mockRejectedValueOnce({ kind: "conflict", message: "conflict", retryable: false })
      .mockResolvedValueOnce(saved("retry"));
    const { hook } = renderAutosave({ save });

    act(() => hook.result.current.save("retry"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });
    expect(hook.result.current.state.state).toBe("error");

    act(() => hook.result.current.retry());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });
    expect(hook.result.current.state.state).toBe("success");
    expect(save).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("clears an old draft and status when the weekly resource changes", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue({ kind: "conflict", message: "conflict", retryable: false });
    const stableService = service(save);
    const hook = renderHook(
      ({ week }) => useWeekNoteAutosave({
        athleteId: "athlete-1",
        enabled: true,
        legacySave: vi.fn(),
        service: stableService,
        week,
        year: 2026,
      }),
      { initialProps: { week: "S12" } },
    );

    act(() => hook.result.current.save("old draft"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });
    expect(hook.result.current.state.state).toBe("error");
    expect(hook.result.current.lastNote).toBe("old draft");

    hook.rerender({ week: "S13" });
    expect(hook.result.current.state.state).toBe("idle");
    expect(hook.result.current.lastNote).toBeNull();
    act(() => hook.result.current.retry());
    expect(save).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("returns a timeout error and aborts the local service signal", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const save = vi.fn((_: unknown, signal?: AbortSignal) => new Promise((_, reject) => {
      signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("aborted", "AbortError"));
      });
    }));
    const { hook } = renderAutosave({ save });

    act(() => hook.result.current.save("timeout"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS + 10_000);
    });

    expect(aborted).toBe(true);
    expect(hook.result.current.state.error).toMatchObject({ kind: "timeout" });
    vi.useRealTimers();
  });

  it("cancels safely after unmount without a late state update", async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof saved>>();
    const transitions: string[] = [];
    const delayedService = service(vi.fn().mockReturnValue(pending.promise));
    const legacySave = vi.fn();
    const hook = renderHook(() => {
      const autosave = useWeekNoteAutosave({
        athleteId: "athlete-1",
        enabled: true,
        legacySave,
        service: delayedService,
        week: "S12",
        year: 2026,
      });
      useEffect(() => {
        transitions.push(autosave.state.state);
      }, [autosave.state.state]);
      return autosave;
    });

    act(() => hook.result.current.save("late"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });
    hook.unmount();
    pending.resolve(saved("late"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(transitions).toEqual(["idle", "pending"]);

    vi.useRealTimers();
  });

  it("keeps development diagnostics free of the note text", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const diagnostic = createWeekNoteAutosaveDiagnostic("development");

    diagnostic({ event: "error", errorKind: "network", path: "v2" });

    expect(JSON.stringify(log.mock.calls)).not.toContain("private training note");
    expect(JSON.stringify(log.mock.calls)).not.toContain("athlete-1");
    log.mockRestore();
  });
});
