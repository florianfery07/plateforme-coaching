import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/athlete/AthleteProfilePage", () => ({
  default: () => <div>Profil</div>,
}));
vi.mock("@/components/athlete/AthleteStatsPage", () => ({
  default: () => <div>Statistiques</div>,
}));
vi.mock("@/components/athlete/WeeklyReviewPage", () => ({
  default: () => <div>Suivi</div>,
}));

import AthletePage from "./AthletePage";

describe("AthletePage", () => {
  it("supports keyboard navigation between athlete sections", () => {
    render(
      <AthletePage
        athleteActive={{ id: "athlete-1" }}
        activeId="athlete-1"
        calendarYear={2026}
        updateAthlete={vi.fn()}
        cpData={[]}
        stats={{}}
        training={[]}
        activeSessions={[]}
        weekColors={{}}
        setWeekColors={vi.fn()}
        weekNotes={{}}
        setWeekNotes={vi.fn()}
        weekPlanning={{}}
        updateWeekPlanning={vi.fn()}
        categories={[]}
        subcategories={[]}
        goalsV2Enabled={false}
        goalsV2State={null}
        openGoalRequestV2={vi.fn()}
        cancelGoalRequestV2={vi.fn()}
        acceptGoalRequestV2={vi.fn()}
        requestGoalChangesV2={vi.fn()}
      />,
    );

    const profile = screen.getByRole("tab", { name: "Profil athlète" });
    const stats = screen.getByRole("tab", { name: "Statistiques annuelles" });
    expect(profile).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(profile, { key: "ArrowRight" });

    expect(stats).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Statistiques annuelles" })).toHaveTextContent("Statistiques");
  });
});
