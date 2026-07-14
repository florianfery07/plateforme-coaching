import type {
  MutationDiagnostic,
  MutationError,
  MutationExecutor,
  MutationOptions,
  MutationResult,
  RollbackHandler,
} from "./types";

type InternalExecution = {
  cancelled: boolean;
  controller: AbortController;
  key: string;
  settlements: Set<Promise<void>>;
  version: number;
};

type ExecutorOptions = {
  onDiagnostic?: (diagnostic: MutationDiagnostic) => void;
};

const errorMessages: Record<MutationError["kind"], string> = {
  network: "The request could not reach the service.",
  validation: "The request contains invalid data.",
  conflict: "The data changed before the request could be applied.",
  permission: "You do not have permission to perform this action.",
  timeout: "The request took too long to complete.",
  unknown: "The request could not be completed.",
};

function toMutationError(error: unknown): MutationError {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const candidate = error as Partial<MutationError>;
    if (typeof candidate.kind === "string" && candidate.kind in errorMessages) {
      return {
        kind: candidate.kind as MutationError["kind"],
        message: errorMessages[candidate.kind as MutationError["kind"]],
        retryable: candidate.retryable === true,
      };
    }
  }

  const candidate = error as { code?: string; status?: number } | null;
  const code = candidate?.code;
  const status = candidate?.status;

  if (code === "42501" || status === 401 || status === 403) {
    return { kind: "permission", message: errorMessages.permission, retryable: false };
  }
  if (code === "23505") {
    return { kind: "conflict", message: errorMessages.conflict, retryable: false };
  }
  if (code === "23514" || status === 400) {
    return { kind: "validation", message: errorMessages.validation, retryable: false };
  }
  if (error instanceof TypeError) {
    return { kind: "network", message: errorMessages.network, retryable: true };
  }

  return { kind: "unknown", message: errorMessages.unknown, retryable: false };
}

function cancelledResult<Output>(executionId: string, durationMs = 0): MutationResult<Output> {
  return {
    attempts: 0,
    data: null,
    durationMs,
    error: null,
    executionId,
    rollbackTriggered: false,
    state: "cancelled",
  };
}

function wait(delayMs: number): Promise<void> {
  return delayMs > 0
    ? new Promise((resolve) => setTimeout(resolve, delayMs))
    : Promise.resolve();
}

async function withTimeout<Output>(
  action: Promise<Output>,
  controller: AbortController,
  timeoutMs: number | undefined,
): Promise<Output> {
  if (!timeoutMs || timeoutMs <= 0) {
    return action;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      action,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject({ kind: "timeout", retryable: false });
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * A local reliability primitive. It coordinates client intent but never
 * replaces server transactions, RLS, or resource authorization.
 */
export function createMutationExecutor(options: ExecutorOptions = {}): MutationExecutor {
  let nextExecution = 0;
  const executions = new Map<string, InternalExecution>();
  const latestVersion = new Map<string, number>();
  const queuedByKey = new Map<string, Promise<unknown>>();

  const execute = async <Input, Output>(
    input: Input,
    mutation: MutationOptions<Input, Output>,
  ): Promise<MutationResult<Output>> => {
    const key = mutation.key;
    const executionId = `mutation-${++nextExecution}`;

    if (mutation.concurrency === "reject" && queuedByKey.has(key)) {
      return {
        attempts: 0,
        data: null,
        durationMs: 0,
        error: null,
        executionId,
        rollbackTriggered: false,
        state: "superseded",
      };
    }

    const version = (latestVersion.get(key) ?? 0) + 1;
    latestVersion.set(key, version);
    const internal: InternalExecution = {
      cancelled: false,
      controller: new AbortController(),
      key,
      settlements: new Set(),
      version,
    };
    executions.set(executionId, internal);

    const run = async (): Promise<MutationResult<Output>> => {
      const startedAt = Date.now();
      let attempts = 0;
      let rollback: RollbackHandler | undefined;
      let rollbackTriggered = false;
      let timedOut = false;

      const rollbackOnce = async (): Promise<void> => {
        if (!rollback || rollbackTriggered) return;
        rollbackTriggered = true;
        await rollback();
      };

      const finish = (result: MutationResult<Output>): MutationResult<Output> => {
        try {
          options.onDiagnostic?.({
            durationMs: result.durationMs,
            rollbackTriggered: result.rollbackTriggered,
            state: result.state,
            timedOut,
            type: mutation.type,
          });
        } catch {
          // Diagnostics are observers: a telemetry failure cannot alter a
          // completed persistence outcome or trigger an optimistic rollback.
        }
        executions.delete(executionId);
        return result;
      };

      if (internal.cancelled) {
        return finish(cancelledResult(executionId));
      }

      try {
        rollback = (await mutation.onMutate?.(input)) ?? undefined;

        const retry = mutation.retry;
        // A caller must explicitly classify retryable failures. This prevents a
        // generic TypeError from replaying a write that may not be idempotent.
        const maxAttempts = retry?.shouldRetry
          ? Math.max(1, retry.attempts)
          : 1;
        let lastError: MutationError | null = null;

        while (attempts < maxAttempts) {
          if (internal.cancelled) {
            await rollbackOnce();
            return finish(cancelledResult(executionId, Date.now() - startedAt));
          }

          attempts += 1;
          try {
            const action = mutation.operation(input, {
              attempt: attempts,
              executionId,
              signal: internal.controller.signal,
            });
            const settlement = Promise.resolve(action).then(
              () => undefined,
              () => undefined,
            );
            internal.settlements.add(settlement);
            void settlement.finally(() => internal.settlements.delete(settlement));
            const data = await withTimeout(
              action,
              internal.controller,
              mutation.timeoutMs,
            );

            if (internal.cancelled) {
              await rollbackOnce();
              return finish(cancelledResult(executionId, Date.now() - startedAt));
            }

            if (mutation.latestWins && latestVersion.get(key) !== internal.version) {
              return finish({
                attempts,
                data: null,
                durationMs: Date.now() - startedAt,
                error: null,
                executionId,
                rollbackTriggered: false,
                state: "superseded",
              });
            }

            try {
              await mutation.onSuccess?.(data);
            } catch (error) {
              // The remote write is already confirmed. Surface a safe callback
              // failure, but never roll back data that may now be persistent.
              return finish({
                attempts,
                data: null,
                durationMs: Date.now() - startedAt,
                error: toMutationError(error),
                executionId,
                rollbackTriggered: false,
                state: "error",
              });
            }

            return finish({
              attempts,
              data,
              durationMs: Date.now() - startedAt,
              error: null,
              executionId,
              rollbackTriggered: false,
              state: "success",
            });
          } catch (error) {
            timedOut ||= toMutationError(error).kind === "timeout";
            lastError = toMutationError(error);

            if (internal.cancelled) {
              await rollbackOnce();
              return finish(cancelledResult(executionId, Date.now() - startedAt));
            }

            // A newer intent owns this resource now. An older failure must not
            // overwrite its outcome or restore an obsolete optimistic state.
            if (mutation.latestWins && latestVersion.get(key) !== internal.version) {
              return finish({
                attempts,
                data: null,
                durationMs: Date.now() - startedAt,
                error: null,
                executionId,
                rollbackTriggered: false,
                state: "superseded",
              });
            }

            const mayRetry =
              attempts < maxAttempts &&
              (retry?.shouldRetry?.(lastError) ?? lastError.retryable);
            if (!mayRetry) break;
            await wait(retry?.delayMs ?? 0);
          }
        }

        await rollbackOnce();
        return finish({
          attempts,
          data: null,
          durationMs: Date.now() - startedAt,
          error: lastError ?? toMutationError(null),
          executionId,
          rollbackTriggered,
          state: "error",
        });
      } catch (error) {
        await rollbackOnce();
        return finish({
          attempts,
          data: null,
          durationMs: Date.now() - startedAt,
          error: toMutationError(error),
          executionId,
          rollbackTriggered,
          state: "error",
        });
      }
    };

    const previous = queuedByKey.get(key);
    const scheduled = mutation.concurrency === "serial" && previous
      ? previous.catch(() => undefined).then(run)
      : run();

    const lock = scheduled.then(
      () => Promise.all([...internal.settlements]).then(() => undefined),
      () => Promise.all([...internal.settlements]).then(() => undefined),
    );
    queuedByKey.set(key, lock);
    void lock.finally(() => {
      if (queuedByKey.get(key) === lock) queuedByKey.delete(key);
    });

    return scheduled;
  };

  return {
    cancel(executionId) {
      const execution = executions.get(executionId);
      if (!execution) return false;
      execution.cancelled = true;
      execution.controller.abort();
      return true;
    },
    cancelByKey(key) {
      for (const [executionId, execution] of executions) {
        if (execution.key === key) {
          execution.cancelled = true;
          execution.controller.abort();
          executions.delete(executionId);
        }
      }
    },
    execute,
  };
}

export function createDevelopmentMutationDiagnostic(
  environment = process.env.NODE_ENV,
): (diagnostic: MutationDiagnostic) => void {
  return (diagnostic) => {
    if (environment !== "development") return;
    console.info("[reliable-mutation]", diagnostic);
  };
}
