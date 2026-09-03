import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/calendar/Session", () => ({
  default: ({ session }: { session: { title: string } }) => <article>{session.title}</article>,
}));
vi.mock("@/components/calendar/AthleteProposalForm", () => ({
  default: () => <div>Formulaire proposition</div>,
}));
vi.mock("@/components/calendar/Proposal", () => ({
  default: () => <div>Proposition</div>,
}));

import DayView from "./DayView";

const selectedDate = new Date(2026, 7, 6);
const commonProps = {
  addAthleteProposal: vi.fn(),
  adjustmentPending: false,
  allAthleteSessions: {},
  cpData: {},
  deleteAthleteWorkoutFromGroupDay: vi.fn(),
  deleteGroupDayWorkouts: vi.fn(),
  nonDonePending: false,
  programProposal: vi.fn(),
  proposalSchedulingPending: false,
  restDayPending: false,
  selectedGroup: null,
  selectedGroupMembers: [],
  setProposals: vi.fn(),
  updateCalendarWorkoutField: vi.fn(),
  updateFeedback: vi.fn(),
  updateNonDone: vi.fn(),
  updateSession: vi.fn(),
};

describe("DayView", () => {
  it("keeps the coach actions available from the labelled day header", () => {
    const addRestDay = vi.fn();
    const setMode = vi.fn();
    render(
      <DayView
        {...commonProps}
        athleteActive={{ name: "Camille" }}
        selectedDate={selectedDate}
        setMode={setMode}
        sessions={[]}
        proposals={[]}
        addRestDay={addRestDay}
        isCoach
        planningTargetType="athlete"
      />,
    );

    expect(screen.getByRole("heading", { name: /jeudi 6 août 2026/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Marquer repos" }));
    expect(addRestDay).toHaveBeenCalledWith(selectedDate);

    fireEvent.click(screen.getByRole("button", { name: "Retour mois" }));
    expect(setMode).toHaveBeenCalledWith("month");
  });
});
