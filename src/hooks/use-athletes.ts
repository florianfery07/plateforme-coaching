import { useCallback } from "react";

import { loadAthletes, type AthletesRepository } from "../services/athletes";
import { useLoadableResult } from "./use-loadable-result";

export function useAthletes(repository: AthletesRepository | null) {
  const load = useCallback(
    () => (repository ? loadAthletes(repository) : Promise.resolve(null)),
    [repository],
  );

  return useLoadableResult(repository ? load : null);
}
