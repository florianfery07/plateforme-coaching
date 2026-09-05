import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Header from "./Header";

afterEach(cleanup);

describe("Header", () => {
  it("provides a labelled navigation and exposes the current view", () => {
    const setView = vi.fn();
    const logout = vi.fn();

    render(
      <Header
        view="calendar"
        setView={setView}
        auth={{ role: "coach" }}
        logout={logout}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Calendriers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Espace coach")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Bibliothèque" }));
    expect(setView).toHaveBeenCalledWith("library");
  });

  it("uses the future-ready coach navigation only when the Pilotage V2 UI is enabled", () => {
    const setView = vi.fn();

    render(
      <Header
        view="calendar"
        setView={setView}
        auth={{ role: "coach" }}
        logout={vi.fn()}
        coachPilotageV2Enabled
      />,
    );

    expect(screen.getByRole("button", { name: "Pilotage" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Athlètes" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Création séance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyse" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bibliothèque" }));
    expect(setView).toHaveBeenCalledWith("library");
  });
});
