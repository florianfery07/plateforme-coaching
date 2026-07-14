import { useCallback, useEffect, useRef, useState } from "react";

import {
  createMutationExecutor,
  type MutationError,
  type MutationOptions,
  type MutationResult,
  type MutationState,
} from "../services/mutations";

type ReliableMutationState<Output> = {
  error: MutationError | null;
  lastSuccess: Output | null;
  pending: boolean;
  state: MutationState;
};

export function useReliableMutation<Input, Output>(
  options: MutationOptions<Input, Output>,
) {
  const [executor] = useState(createMutationExecutor);
  const mountedRef = useRef(true);
  const [state, setState] = useState<ReliableMutationState<Output>>({
    error: null,
    lastSuccess: null,
    pending: false,
    state: "idle",
  });
  const requestVersionRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
      executor.cancelByKey(options.key);
    };
  }, [executor, options.key]);

  const mutate = useCallback(async (input: Input): Promise<MutationResult<Output>> => {
    const requestVersion = ++requestVersionRef.current;
    if (mountedRef.current) {
      setState((current) => ({ ...current, error: null, pending: true, state: "pending" }));
    }
    const result = await executor.execute(input, options);
    if (mountedRef.current && requestVersion === requestVersionRef.current) {
      setState((current) => ({
        error: result.error,
        lastSuccess: result.state === "success" ? result.data : current.lastSuccess,
        pending: false,
        state: result.state,
      }));
    }
    return result;
  }, [executor, options]);

  const cancel = useCallback(() => {
    requestVersionRef.current += 1;
    executor.cancelByKey(options.key);
    if (mountedRef.current) {
      setState((current) => ({ ...current, error: null, pending: false, state: "cancelled" }));
    }
  }, [executor, options.key]);

  const reset = useCallback(() => {
    requestVersionRef.current += 1;
    if (mountedRef.current) {
      setState({ error: null, lastSuccess: null, pending: false, state: "idle" });
    }
  }, []);

  return { ...state, cancel, mutate, reset };
}
