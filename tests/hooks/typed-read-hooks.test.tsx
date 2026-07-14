import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAthletes } from "../../src/hooks/use-athletes";
import { useCurrentAuthContext } from "../../src/hooks/use-current-auth-context";
import type { AuthRepository } from "../../src/services/auth";
import type { AthletesRepository } from "../../src/services/athletes";

const athletesRepository: AthletesRepository = {
  listAthletes: vi.fn().mockResolvedValue({ data: [], error: null }),
};

const authRepository: AuthRepository = {
  getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
  findAthleteByUserId: vi.fn(),
  findLegacyRoleByUserId: vi.fn(),
};

describe("typed read hooks", () => {
  it("starts idle without a repository and resolves an empty athlete read", async () => {
    const idle = renderHook(() => useAthletes(null));
    expect(idle.result.current.state).toEqual({ kind: "idle" });
    idle.unmount();

    const active = renderHook(() => useAthletes(athletesRepository));
    await waitFor(() => {
      expect(active.result.current.state).toEqual({
        kind: "resolved",
        result: { kind: "empty", athletes: [], archivedAthletes: [] },
      });
    });
    active.unmount();
  });

  it("supports an explicit refresh without mutation", async () => {
    const repository: AthletesRepository = {
      listAthletes: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const hook = renderHook(() => useAthletes(repository));

    await waitFor(() => expect(hook.result.current.state.kind).toBe("resolved"));
    await act(async () => {
      await hook.result.current.refresh();
    });

    expect(repository.listAthletes).toHaveBeenCalledTimes(2);
    hook.unmount();
  });

  it("resolves the auth context and ignores an in-flight result after unmount", async () => {
    const authHook = renderHook(() => useCurrentAuthContext(authRepository));
    await waitFor(() => {
      expect(authHook.result.current.state).toEqual({
        kind: "resolved",
        result: { kind: "unauthenticated" },
      });
    });
    authHook.unmount();

    let resolveRequest: ((value: { data: unknown[]; error: null }) => void) | undefined;
    const slowRepository: AthletesRepository = {
      listAthletes: () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    };
    const slowHook = renderHook(() => useAthletes(slowRepository));
    slowHook.unmount();

    act(() => {
      resolveRequest?.({ data: [], error: null });
    });
    expect(slowHook.result.current.state.kind).not.toBe("resolved");
  });
});
