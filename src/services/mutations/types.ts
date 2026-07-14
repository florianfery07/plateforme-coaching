export type MutationState =
  | "idle"
  | "pending"
  | "success"
  | "error"
  | "superseded"
  | "cancelled";

export type MutationErrorKind =
  | "network"
  | "validation"
  | "conflict"
  | "permission"
  | "timeout"
  | "unknown";

export type MutationError = {
  kind: MutationErrorKind;
  message: string;
  retryable: boolean;
};

export type MutationContext = {
  attempt: number;
  executionId: string;
  signal: AbortSignal;
};

export type MutationOperation<Input, Output> = (
  input: Input,
  context: MutationContext,
) => Promise<Output>;

export type RollbackHandler = () => void | Promise<void>;

export type MutationDiagnostic = {
  durationMs: number;
  rollbackTriggered: boolean;
  state: Exclude<MutationState, "idle" | "pending">;
  timedOut: boolean;
  type: string;
};

export type MutationOptions<Input, Output> = {
  concurrency?: "parallel" | "serial" | "reject";
  key: string;
  latestWins?: boolean;
  onMutate?: (input: Input) => void | RollbackHandler | Promise<void | RollbackHandler>;
  onSuccess?: (output: Output) => void | Promise<void>;
  operation: MutationOperation<Input, Output>;
  retry?: {
    attempts: number;
    delayMs?: number;
    shouldRetry?: (error: MutationError) => boolean;
  };
  timeoutMs?: number;
  type: string;
};

export type MutationResult<Output> = {
  attempts: number;
  data: Output | null;
  durationMs: number;
  error: MutationError | null;
  executionId: string;
  rollbackTriggered: boolean;
  state: Exclude<MutationState, "idle" | "pending">;
};

export type MutationExecutor = {
  cancel: (executionId: string) => boolean;
  cancelByKey: (key: string) => void;
  execute: <Input, Output>(
    input: Input,
    options: MutationOptions<Input, Output>,
  ) => Promise<MutationResult<Output>>;
};
