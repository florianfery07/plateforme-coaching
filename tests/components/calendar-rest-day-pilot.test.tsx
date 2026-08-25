import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DayView from "../../src/components/calendar/DayView";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

function renderDayView(restDayPending = false) {
  const addRestDay = vi.fn();
  render(
    <DayView
      athleteActive={{ id: "athlete-1", name: "Athlete" }}
      selectedDate={new Date("2026-08-18T12:00:00")}
      setMode={vi.fn()}
      sessions={[]}
      proposals={[]}
      cpData={{}}
      addRestDay={addRestDay}
      deleteAthleteWorkoutFromGroupDay={vi.fn()}
      deleteGroupDayWorkouts={vi.fn()}
      updateFeedback={vi.fn()}
      updateNonDone={vi.fn()}
      updateSession={vi.fn()}
      updateCalendarWorkoutField={vi.fn()}
      setProposals={vi.fn()}
      programProposal={vi.fn()}
      addAthleteProposal={vi.fn()}
      isCoach
      planningTargetType="athlete"
      selectedGroup={null}
      restDayPending={restDayPending}
    />,
  );
  return addRestDay;
}

describe("calendar rest-day pilot control", () => {
  afterEach(cleanup);

  it("keeps the existing rest-day action available when no mutation is pending", () => {
    const addRestDay = renderDayView();
    const button = screen.getByRole("button", { name: "Marquer repos" });

    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(addRestDay).toHaveBeenCalledTimes(1);
  });

  it("prevents a second UI submission while the targeted mutation is pending", () => {
    const addRestDay = renderDayView(true);
    const button = screen.getByRole("button", { name: "Marquer repos" });

    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(addRestDay).not.toHaveBeenCalled();
  });
});
