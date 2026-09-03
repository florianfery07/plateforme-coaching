import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MonthView from "./MonthView";

const days = Array.from({ length: 7 }, (_, index) => new Date(2026, 7, index + 3));

describe("MonthView", () => {
  it("keeps every current-month day directly reachable and opens the selected day", () => {
    const setMode = vi.fn();
    const setSelectedDate = vi.fn();
    render(
      <MonthView
        days={days}
        sessionsFor={() => []}
        proposalsFor={() => []}
        setSelectedDate={setSelectedDate}
        setMode={setMode}
        selectedDate={days[1]}
        currentMonth={7}
        planningTargetType="athlete"
      />,
    );

    const selectedDays = screen.getAllByRole("button", { name: /Ouvrir mar\. 4 août/i });
    expect(selectedDays[0]).toHaveAttribute("aria-current", "date");

    fireEvent.click(screen.getAllByRole("button", { name: /Ouvrir jeu\. 6 août/i })[0]);
    expect(setSelectedDate).toHaveBeenCalledWith(days[3]);
    expect(setMode).toHaveBeenCalledWith("day");
  });

  it("summarises a programmed day before opening its details", () => {
    render(
      <MonthView
        days={days}
        sessionsFor={(date: Date) => date.getDate() === 3 ? [{ id: "session-1", title: "Endurance", category: "Route", feedback: {} }] : []}
        proposalsFor={() => []}
        setSelectedDate={vi.fn()}
        setMode={vi.fn()}
        selectedDate={days[0]}
        currentMonth={7}
        planningTargetType="athlete"
      />,
    );

    expect(screen.getAllByText("Endurance").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Ouvrir lun\. 3 août, 1 élément/i }).length).toBeGreaterThan(0);
  });
});
