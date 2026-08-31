import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("keeps persistent labels and announces a login error", async () => {
    const loginCoach = vi.fn().mockResolvedValue(false);
    render(
      <AuthPage athletes={[]} loginCoach={loginCoach} loginAthlete={vi.fn()} acceptInvite={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Email coach"), { target: { value: "coach@example.test" } });
    fireEvent.change(screen.getByLabelText("Mot de passe coach"), { target: { value: "incorrect" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter coach" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
    expect(loginCoach).toHaveBeenCalledWith("coach@example.test", "incorrect");
  });
});
