import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AthleteSelector from "./AthleteSelector";

describe("AthleteSelector", () => {
  it("exposes the target choice and selector options to keyboard and assistive technology", () => {
    const setActiveId = vi.fn();
    render(
      <AthleteSelector
        visible
        athletes={[{ id: "athlete-1", calendarName: "Athlète 1", color: "blue" }]}
        activeId="athlete-1"
        setActiveId={setActiveId}
        planningTargetType="athlete"
        setPlanningTargetType={vi.fn()}
        athleteGroups={[]}
        selectedGroupId=""
        setSelectedGroupId={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Athlète" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Athlète 1/ }));
    const options = screen.getByRole("group", { name: "Athlètes disponibles" });
    expect(options).toBeVisible();

    fireEvent.click(within(options).getByRole("button", { name: /Athlète 1/ }));
    expect(setActiveId).toHaveBeenCalledWith("athlete-1");
  });
});
