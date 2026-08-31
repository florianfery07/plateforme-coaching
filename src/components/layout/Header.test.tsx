import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Header from "./Header";

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
});
