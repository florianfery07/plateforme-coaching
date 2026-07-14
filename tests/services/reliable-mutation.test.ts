import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useReliableMutation } from "../../src/hooks/use-reliable-mutation";
import {
  createDebouncedMutation,
  createDevelopmentMutationDiagnostic,
  createMutationExecutor,
  type MutationResult,
} from "../../src/services/mutations";

function deferred<Value>() {
  let resolve: (value: Value) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<Value>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject: reject!, resolve: resolve! };
}

function success<Value>(data: Value): MutationResult<Value> {
  return {
    attempts: 1,
    data,
    durationMs: 0,
    error: null,
    executionId: "test",
    rollbackTriggered: false,
    state: "success",
  };
}

describe("reliable mutation foundation", () => {
  it("returns success and confirms after the operation", async () => {
    const onSuccess = vi.fn();
    const result = await createMutationExecutor().execute("value", {
      operation: vi.fn().mockResolvedValue("saved"),
      onSuccess,
      key: "athlete:one",
      type: "athlete.save",
    });

    expect(result).toMatchObject({ data: "saved", state: "success" });
    expect(onSuccess).toHaveBeenCalledWith("saved");
  });

  it("surfaces a confirmation callback failure without rolling back a saved write", async () => {
    const rollback = vi.fn();
    const result = await createMutationExecutor().execute("value", {
      key: "athlete:one",
      onMutate: () => rollback,
      onSuccess: () => {
        throw new Error("view callback failed");
      },
      operation: vi.fn().mockResolvedValue("saved"),
      type: "athlete.save",
    });

    expect(result).toMatchObject({ error: { kind: "unknown" }, rollbackTriggered: false, state: "error" });
    expect(rollback).not.toHaveBeenCalled();
  });

  it("normalizes errors and rolls back only an optimistic update", async () => {
    const rollback = vi.fn();
    const result = await createMutationExecutor().execute("value", {
      onMutate: () => rollback,
      operation: vi.fn().mockRejectedValue(new TypeError("network details")),
      key: "athlete:one",
      type: "athlete.save",
    });

    expect(result).toMatchObject({
      error: { kind: "network", message: "The request could not reach the service." },
      rollbackTriggered: true,
      state: "error",
    });
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it("does not invent a rollback when no optimistic update exists", async () => {
    const result = await createMutationExecutor().execute("value", {
      operation: vi.fn().mockRejectedValue({ code: "23514" }),
      key: "athlete:one",
      type: "athlete.save",
    });

    expect(result).toMatchObject({ rollbackTriggered: false, state: "error" });
  });

  it("attempts a failing rollback only once", async () => {
    const rollback = vi.fn().mockRejectedValue(new Error("rollback failed"));
    const result = await createMutationExecutor().execute("value", {
      key: "athlete:one",
      onMutate: () => rollback,
      operation: vi.fn().mockRejectedValue(new TypeError("offline")),
      type: "athlete.save",
    });

    expect(result).toMatchObject({ rollbackTriggered: true, state: "error" });
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it("blocks a configured double submission", async () => {
    const pending = deferred<string>();
    const operation = vi.fn().mockReturnValue(pending.promise);
    const executor = createMutationExecutor();
    const first = executor.execute("first", { concurrency: "reject", key: "workout:one", operation, type: "workout.save" });
    const second = await executor.execute("second", { concurrency: "reject", key: "workout:one", operation, type: "workout.save" });

    expect(second.state).toBe("superseded");
    expect(operation).toHaveBeenCalledTimes(1);
    pending.resolve("done");
    await expect(first).resolves.toMatchObject({ state: "success" });
  });

  it("does not run optimistic work for a rejected duplicate", async () => {
    const pending = deferred<string>();
    const onMutate = vi.fn();
    const executor = createMutationExecutor();
    const first = executor.execute("first", {
      concurrency: "reject",
      key: "workout:one",
      operation: vi.fn().mockReturnValue(pending.promise),
      type: "workout.save",
    });
    const second = await executor.execute("second", {
      concurrency: "reject",
      key: "workout:one",
      onMutate,
      operation: vi.fn(),
      type: "workout.save",
    });

    expect(second.state).toBe("superseded");
    expect(onMutate).not.toHaveBeenCalled();
    pending.resolve("saved");
    await first;
  });

  it("does not supersede an active latest-wins mutation when rejecting a duplicate", async () => {
    const pending = deferred<string>();
    const operation = vi.fn().mockReturnValue(pending.promise);
    const executor = createMutationExecutor();
    const first = executor.execute("first", {
      concurrency: "reject",
      key: "workout:one",
      latestWins: true,
      operation,
      type: "workout.save",
    });
    const second = await executor.execute("second", {
      concurrency: "reject",
      key: "workout:one",
      latestWins: true,
      operation,
      type: "workout.save",
    });

    pending.resolve("saved");
    await expect(first).resolves.toMatchObject({ state: "success" });
    expect(second).toMatchObject({ state: "superseded" });
  });

  it("serializes calls by type", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const executor = createMutationExecutor();
    const firstRun = executor.execute("first", { concurrency: "serial", key: "planning:one", operation, type: "planning.save" });
    const secondRun = executor.execute("second", { concurrency: "serial", key: "planning:one", operation, type: "planning.save" });

    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);
    first.resolve("first");
    await expect(firstRun).resolves.toMatchObject({ state: "success" });
    expect(operation).toHaveBeenCalledTimes(2);
    second.resolve("second");
    await expect(secondRun).resolves.toMatchObject({ data: "second", state: "success" });
  });

  it("waits for a failed serialized mutation and its rollback before continuing", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const rollback = vi.fn();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const executor = createMutationExecutor();
    const firstRun = executor.execute("first", {
      concurrency: "serial",
      key: "planning:one",
      onMutate: () => rollback,
      operation,
      type: "planning.save",
    });
    const secondRun = executor.execute("second", {
      concurrency: "serial",
      key: "planning:one",
      operation,
      type: "planning.save",
    });

    first.reject(new TypeError("offline"));
    await expect(firstRun).resolves.toMatchObject({ state: "error" });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(2);
    second.resolve("second");
    await expect(secondRun).resolves.toMatchObject({ state: "success" });
  });

  it("keeps the latest intent when earlier responses arrive late", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const executor = createMutationExecutor();
    const firstRun = executor.execute("first", { key: "note:one", latestWins: true, operation, type: "note.save" });
    const secondRun = executor.execute("second", { key: "note:one", latestWins: true, operation, type: "note.save" });

    second.resolve("second");
    await expect(secondRun).resolves.toMatchObject({ data: "second", state: "success" });
    first.resolve("first");
    await expect(firstRun).resolves.toMatchObject({ data: null, state: "superseded" });
  });

  it("ignores an obsolete error without rolling back the newer intent", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const rollback = vi.fn();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const executor = createMutationExecutor();
    const firstRun = executor.execute("first", {
      key: "note:one",
      latestWins: true,
      onMutate: () => rollback,
      operation,
      type: "note.save",
    });
    const secondRun = executor.execute("second", {
      key: "note:one",
      latestWins: true,
      operation,
      type: "note.save",
    });

    second.resolve("second");
    await expect(secondRun).resolves.toMatchObject({ state: "success" });
    first.reject(new TypeError("offline"));
    await expect(firstRun).resolves.toMatchObject({ rollbackTriggered: false, state: "superseded" });
    expect(rollback).not.toHaveBeenCalled();
  });

  it("times out, aborts the local signal, and rolls back once", async () => {
    vi.useFakeTimers();
    const rollback = vi.fn();
    let aborted = false;
    const request = createMutationExecutor().execute("value", {
      onMutate: () => rollback,
      operation: (_, context) => new Promise((_, reject) => {
        context.signal.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
      key: "feedback:one",
      timeoutMs: 5,
      type: "feedback.save",
    });
    await vi.advanceTimersByTimeAsync(5);
    const result = await request;

    expect(result).toMatchObject({ error: { kind: "timeout" }, rollbackTriggered: true, state: "error" });
    expect(aborted).toBe(true);
    expect(rollback).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("keeps a timed-out non-cooperative request locked until it settles", async () => {
    vi.useFakeTimers();
    const delayed = deferred<string>();
    const executor = createMutationExecutor();
    const first = executor.execute("first", {
      concurrency: "reject",
      key: "feedback:one",
      operation: vi.fn().mockReturnValue(delayed.promise),
      timeoutMs: 5,
      type: "feedback.save",
    });

    await vi.advanceTimersByTimeAsync(5);
    await expect(first).resolves.toMatchObject({ error: { kind: "timeout" }, state: "error" });
    const blocked = await executor.execute("second", {
      concurrency: "reject",
      key: "feedback:one",
      operation: vi.fn().mockResolvedValue("second"),
      type: "feedback.save",
    });
    expect(blocked.state).toBe("superseded");

    delayed.resolve("late");
    await vi.advanceTimersByTimeAsync(0);
    const recovered = await executor.execute("third", {
      concurrency: "reject",
      key: "feedback:one",
      operation: vi.fn().mockResolvedValue("third"),
      type: "feedback.save",
    });
    expect(recovered).toMatchObject({ data: "third", state: "success" });
    vi.useRealTimers();
  });

  it("retries only when explicitly allowed", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce("saved");
    const result = await createMutationExecutor().execute("value", {
      operation,
      key: "athlete:one",
      retry: { attempts: 2, shouldRetry: (error) => error.kind === "network" },
      type: "athlete.save",
    });

    expect(result).toMatchObject({ attempts: 2, data: "saved", state: "success" });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry without an explicit retry predicate", async () => {
    const operation = vi.fn().mockRejectedValue(new TypeError("offline"));
    const result = await createMutationExecutor().execute("value", {
      key: "athlete:one",
      operation,
      retry: { attempts: 2 },
      type: "athlete.save",
    });

    expect(result).toMatchObject({ attempts: 1, state: "error" });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("cancels an active execution without exposing its late result", async () => {
    const pending = deferred<string>();
    let executionId = "";
    const executor = createMutationExecutor();
    const run = executor.execute("value", {
      key: "athlete:one",
      operation: (_, context) => {
        executionId = context.executionId;
        return pending.promise;
      },
      type: "athlete.save",
    });

    await Promise.resolve();
    expect(executor.cancel(executionId)).toBe(true);
    pending.resolve("late");
    await expect(run).resolves.toMatchObject({ state: "cancelled" });
  });

  it("debounces to the latest value and supports flush and cancel", async () => {
    vi.useFakeTimers();
    const run = vi.fn((value: string) => Promise.resolve(success(value)));
    const debounced = createDebouncedMutation({ delayMs: 50, run });
    const first = debounced.schedule("first");
    const second = debounced.schedule("second");

    await expect(first).resolves.toMatchObject({ state: "superseded" });
    await vi.advanceTimersByTimeAsync(50);
    await expect(second).resolves.toMatchObject({ data: "second", state: "success" });
    expect(run).toHaveBeenCalledTimes(1);

    const flushed = debounced.schedule("flushed");
    await debounced.flush();
    await expect(flushed).resolves.toMatchObject({ data: "flushed", state: "success" });

    const cancelled = debounced.schedule("cancelled");
    debounced.cancel();
    await expect(cancelled).resolves.toMatchObject({ state: "cancelled" });
    vi.useRealTimers();
  });

  it("cancels an active debounced intention even when a new one is scheduled", async () => {
    vi.useFakeTimers();
    const active = deferred<MutationResult<string>>();
    const run = vi.fn().mockReturnValueOnce(active.promise).mockResolvedValueOnce(success("new"));
    const debounced = createDebouncedMutation({ delayMs: 0, run });
    const oldRun = debounced.schedule("old");

    await vi.advanceTimersByTimeAsync(0);
    debounced.cancel();
    const newRun = debounced.schedule("new");
    active.resolve(success("old"));

    await expect(oldRun).resolves.toMatchObject({ state: "cancelled" });
    await expect(newRun).resolves.toMatchObject({ data: "new", state: "success" });
    vi.useRealTimers();
  });

  it("unblocks a debounced queue after an unexpected runner rejection", async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new Error("unexpected"))
      .mockResolvedValueOnce(success("recovered"));
    const debounced = createDebouncedMutation({ delayMs: 0, run });
    const failed = debounced.schedule("first");

    await expect(failed).resolves.toMatchObject({ error: { kind: "unknown" }, state: "error" });
    const recovered = debounced.schedule("second");
    await expect(recovered).resolves.toMatchObject({ data: "recovered", state: "success" });
  });

  it("cancels safely on hook unmount without applying a late result", async () => {
    const pending = deferred<string>();
    const operation = vi.fn().mockReturnValue(pending.promise);
    const hook = renderHook(() => useReliableMutation({ key: "athlete:one", operation, type: "athlete.save" }));

    let promise: Promise<MutationResult<unknown>>;
    await act(async () => {
      promise = hook.result.current.mutate("value");
    });
    hook.unmount();
    pending.resolve("late");

    await expect(promise!).resolves.toMatchObject({ state: "cancelled" });
  });

  it("ignores a late request from the previous resource key", async () => {
    const first = deferred<string>();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce("new resource");
    const hook = renderHook(
      ({ key }) => useReliableMutation({ key, operation, type: "athlete.save" }),
      { initialProps: { key: "athlete:one" } },
    );

    let firstRun: Promise<MutationResult<unknown>>;
    await act(async () => {
      firstRun = hook.result.current.mutate("old");
    });
    hook.rerender({ key: "athlete:two" });
    first.resolve("old resource");
    await expect(firstRun!).resolves.toMatchObject({ state: "cancelled" });
    expect(hook.result.current).toMatchObject({ lastSuccess: null, state: "pending" });

    await act(async () => {
      await hook.result.current.mutate("new");
    });
    expect(hook.result.current).toMatchObject({ lastSuccess: "new resource", state: "success" });
  });

  it("publishes cancellation immediately from the hook", async () => {
    const pending = deferred<string>();
    const hook = renderHook(() => useReliableMutation({
      key: "athlete:one",
      operation: vi.fn().mockReturnValue(pending.promise),
      type: "athlete.save",
    }));

    await act(async () => {
      void hook.result.current.mutate("value");
    });
    act(() => {
      hook.result.current.cancel();
    });

    expect(hook.result.current).toMatchObject({ error: null, pending: false, state: "cancelled" });
    pending.resolve("late");
  });

  it("keeps the hook active after a resource-key change", async () => {
    const operation = vi.fn().mockResolvedValue("saved");
    const hook = renderHook(
      ({ key }) => useReliableMutation({ key, operation, type: "athlete.save" }),
      { initialProps: { key: "athlete:one" } },
    );

    hook.rerender({ key: "athlete:two" });
    await act(async () => {
      await hook.result.current.mutate("value");
    });

    expect(hook.result.current).toMatchObject({ lastSuccess: "saved", pending: false, state: "success" });
  });

  it("keeps the hook pending for its newest concurrent request", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const operation = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const hook = renderHook(() => useReliableMutation({ key: "athlete:one", operation, type: "athlete.save" }));

    let firstRun: Promise<MutationResult<unknown>>;
    let secondRun: Promise<MutationResult<unknown>>;
    await act(async () => {
      firstRun = hook.result.current.mutate("first");
      secondRun = hook.result.current.mutate("second");
    });
    first.resolve("first");
    await act(async () => {
      await firstRun!;
    });
    expect(hook.result.current.pending).toBe(true);

    second.resolve("second");
    await act(async () => {
      await secondRun!;
    });
    expect(hook.result.current).toMatchObject({ lastSuccess: "second", pending: false, state: "success" });
  });

  it("keeps diagnostics free of mutation input", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const executor = createMutationExecutor({
      onDiagnostic: createDevelopmentMutationDiagnostic("development"),
    });
    await executor.execute(
      { email: "athlete@example.test", note: "private training content" },
      { key: "athlete:one", operation: vi.fn().mockResolvedValue("saved"), type: "athlete.save" },
    );

    expect(JSON.stringify(log.mock.calls)).not.toContain("athlete@example.test");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private training content");
    log.mockRestore();
  });

  it("does not let a diagnostic observer change a confirmed mutation", async () => {
    const rollback = vi.fn();
    const result = await createMutationExecutor({
      onDiagnostic: () => {
        throw new Error("diagnostics unavailable");
      },
    }).execute("value", {
      key: "athlete:one",
      onMutate: () => rollback,
      operation: vi.fn().mockResolvedValue("saved"),
      type: "athlete.save",
    });

    expect(result).toMatchObject({ data: "saved", rollbackTriggered: false, state: "success" });
    expect(rollback).not.toHaveBeenCalled();
  });
});
