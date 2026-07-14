import { useCallback } from "react";

import { loadCurrentUserContext, type AuthRepository } from "../services/auth";
import { useLoadableResult } from "./use-loadable-result";

export function useCurrentAuthContext(repository: AuthRepository | null) {
  const load = useCallback(
    () => (repository ? loadCurrentUserContext(repository) : Promise.resolve(null)),
    [repository],
  );

  return useLoadableResult(repository ? load : null);
}
