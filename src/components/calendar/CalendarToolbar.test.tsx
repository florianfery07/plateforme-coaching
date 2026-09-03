import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CalendarToolbar from "./CalendarToolbar";

const baseProps = {
  athleteActive: { calendarName: "Calendrier de Camille" },
  athleteGroups: [],
  isCoach: true,
  month: 0,
  planningTargetType: "athlete",
  selectedGroup: null,
  selectedGroupId: "",
  selectedGroupMembers: [],
  setMode: vi.fn(),
  setMonth: vi.fn(),
  setPlanningTargetType: vi.fn(),
  setSelectedGroupId: vi.fn(),
  setYear: vi.fn(),
  year: 2026,
};

describe("CalendarToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("identifies the current view and exposes labelled period controls", () => {
    render(<CalendarToolbar {...baseProps} mode="month" />);

    expect(screen.getByRole("tablist", { name: "Vue du calendrier" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Mois" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Année" })).toHaveValue("2026");
    expect(screen.getByRole("combobox", { name: "Mois" })).toHaveValue("0");
  });

  it("moves to the adjacent month with existing year and month callbacks", () => {
    const setMonth = vi.fn();
    const setYear = vi.fn();
    render(<CalendarToolbar {...baseProps} mode="month" month={11} setMonth={setMonth} setYear={setYear} />);

    fireEvent.click(screen.getByRole("button", { name: "Mois suivant" }));

    expect(setYear).toHaveBeenCalledWith(2027);
    expect(setMonth).toHaveBeenCalledWith(0);
  });

  it("supports the expected keyboard navigation for calendar views", () => {
    const setMode = vi.fn();
    render(<CalendarToolbar {...baseProps} mode="month" setMode={setMode} />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Mois" }), { key: "ArrowRight" });

    expect(setMode).toHaveBeenCalledWith("day");
    expect(screen.getByRole("tab", { name: "Jour" })).toHaveFocus();
  });
});
