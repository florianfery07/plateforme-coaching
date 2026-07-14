import { useCallback, useEffect, useRef, useState } from "react";

export type LoadableResultState<Result> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "resolved"; result: Result };

export function useLoadableResult<Result>(
  load: (() => Promise<Result>) | null,
): { state: LoadableResultState<Result>; refresh: () => Promise<void> } {
  const [state, setState] = useState<LoadableResultState<Result>>({ kind: "idle" });
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!load) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ kind: "loading" });
    const result = await load();

    if (mountedRef.current && requestIdRef.current === requestId) {
      setState({ kind: "resolved", result });
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    if (load) {
      queueMicrotask(() => {
        if (!cancelled) {
          void refresh();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [load, refresh]);

  return { state, refresh };
}
