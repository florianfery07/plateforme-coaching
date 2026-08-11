import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features", () => ({ isFeatureEnabled: () => true }));
vi.mock("@/hooks/use-reliable-mutation", () => ({
  useReliableMutation: () => ({ error: null, mutate: vi.fn(), pending: false }),
}));

import AuthPage from "./AuthPage";

const token = `v2i_${"a".repeat(64)}`;

function renderPage() {
  return render(
    <StrictMode>
      <AuthPage athletes={[]} loginCoach={vi.fn()} loginAthlete={vi.fn()} acceptInvite={vi.fn()} />
    </StrictMode>,
  );
}

describe("AuthPage V2 invitation fragment", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("captures and clears a fragment after client mount in Strict Mode", async () => {
    window.history.replaceState(null, "", `/#invite=${token}`);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Invitation athlète" })).toBeVisible();
    expect(window.location.hash).toBe("");
    expect(document.documentElement.innerHTML).not.toContain(token);
  });

  it("synchronizes a later fragment navigation on the same route", async () => {
    renderPage();
    await act(async () => {
      window.history.pushState(null, "", `/#invite=${token}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(await screen.findByRole("heading", { name: "Invitation athlète" })).toBeVisible();
    expect(window.location.hash).toBe("");
  });
});
