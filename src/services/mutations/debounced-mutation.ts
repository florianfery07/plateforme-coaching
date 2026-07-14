import type { MutationResult } from "./types";

type DebouncedMutationOptions<Input, Output> = {
  delayMs: number;
  run: (input: Input) => Promise<MutationResult<Output>>;
};

type Pending<Input, Output> = {
  generation: number;
  input: Input;
  resolve: (result: MutationResult<Output>) => void;
};

function cancelledResult<Output>(): MutationResult<Output> {
  return {
    attempts: 0,
    data: null,
    durationMs: 0,
    error: null,
    executionId: "debounced-cancelled",
    rollbackTriggered: false,
    state: "cancelled",
  };
}

function supersededResult<Output>(): MutationResult<Output> {
  return { ...cancelledResult<Output>(), executionId: "debounced-superseded", state: "superseded" };
}

function unexpectedErrorResult<Output>(): MutationResult<Output> {
  return {
    ...cancelledResult<Output>(),
    error: {
      kind: "unknown",
      message: "The request could not be completed.",
      retryable: false,
    },
    executionId: "debounced-error",
    state: "error",
  };
}

/** Keeps only the latest pending intention and never runs two local writes at once. */
export function createDebouncedMutation<Input, Output>(
  options: DebouncedMutationOptions<Input, Output>,
) {
  let active = false;
  let generation = 0;
  let pending: Pending<Input, Output> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const start = async (): Promise<void> => {
    if (active || !pending) return;
    const current = pending;
    pending = null;
    active = true;
    try {
      const result = await options.run(current.input);
      current.resolve(
        current.generation === generation ? result : cancelledResult<Output>(),
      );
    } catch {
      current.resolve(unexpectedErrorResult<Output>());
    } finally {
      active = false;
      if (pending) void start();
    }
  };

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await start();
  };

  return {
    schedule(input: Input): Promise<MutationResult<Output>> {
      if (pending) pending.resolve(supersededResult<Output>());
      const result = new Promise<MutationResult<Output>>((resolve) => {
        pending = { generation, input, resolve };
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void start();
      }, options.delayMs);
      return result;
    },
    flush,
    cancel(): void {
      generation += 1;
      if (timer) clearTimeout(timer);
      timer = null;
      if (pending) pending.resolve(cancelledResult<Output>());
      pending = null;
    },
  };
}
