import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const observationsQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
};
const historyQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
};

observationsQuery.select.mockReturnValue(observationsQuery);
observationsQuery.eq.mockReturnValue(observationsQuery);
observationsQuery.order.mockResolvedValue({ data: [], error: null });
historyQuery.select.mockReturnValue(historyQuery);
historyQuery.eq.mockReturnValue(historyQuery);
historyQuery.order.mockResolvedValue({ data: [], error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => table === "athlete_observations" ? observationsQuery : historyQuery),
  },
}));

vi.mock("@/components/athlete/CP", () => ({
  default: () => <div>Tests de puissance</div>,
}));

vi.mock("@/components/athlete/AthleteInviteV2Panel", () => ({
  default: () => <div>Invitation sécurisée</div>,
}));

vi.mock("@/components/athlete/AthleteGoalsV2Panel", () => ({
  CoachGoalsV2Panel: () => <div>Workflow Goals V2</div>,
}));

import AthleteProfilePage from "./AthleteProfilePage";

const athlete = {
  active: true,
  age: "29",
  calendarName: "Calendrier Léa",
  context: "Préparation montagne",
  email: "lea@example.test",
  height: "170",
  id: "athlete-1",
  inviteToken: "synthetic-invite-token",
  longGoal: "Objectif long",
  mediumGoal: "Objectif moyen",
  name: "Léa Martin",
  shortGoal: "Objectif court",
  weight: "58",
};

describe("AthleteProfilePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    observationsQuery.select.mockReturnValue(observationsQuery);
    observationsQuery.eq.mockReturnValue(observationsQuery);
    observationsQuery.order.mockResolvedValue({ data: [], error: null });
    historyQuery.select.mockReturnValue(historyQuery);
    historyQuery.eq.mockReturnValue(historyQuery);
    historyQuery.order.mockResolvedValue({ data: [], error: null });
  });

  function renderProfile(overrides = {}) {
    return render(
      <AthleteProfilePage
        athlete={{ ...athlete, ...overrides }}
        updateAthlete={vi.fn()}
        cpData={null}
        goalsV2Enabled={false}
        goalsV2State={null}
        openGoalRequestV2={vi.fn()}
        cancelGoalRequestV2={vi.fn()}
        acceptGoalRequestV2={vi.fn()}
        requestGoalChangesV2={vi.fn()}
      />,
    );
  }

  it("prioritizes athlete status and keeps daily sections keyboard-operable", async () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Léa Martin" })).toBeVisible();
    expect(screen.getByText("Actif")).toBeVisible();
    expect(screen.getByRole("button", { name: /Objectifs et contexte/ })).toHaveAttribute("aria-expanded", "true");

    const tests = screen.getByRole("button", { name: /Tests principaux/ });
    expect(tests).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(tests);

    expect(tests).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Tests de puissance")).toBeVisible();
    await waitFor(() => expect(observationsQuery.order).toHaveBeenCalledTimes(1));
  });

  it("keeps the Goals V2 pilot separated from the legacy goal editor", () => {
    render(
      <AthleteProfilePage
        athlete={athlete}
        updateAthlete={vi.fn()}
        cpData={null}
        goalsV2Enabled
        goalsV2State={{ current: null, history: [], legacyAthleteId: athlete.id, openRequest: null }}
        openGoalRequestV2={vi.fn()}
        cancelGoalRequestV2={vi.fn()}
        acceptGoalRequestV2={vi.fn()}
        requestGoalChangesV2={vi.fn()}
      />,
    );

    expect(screen.getByText("Workflow Goals V2")).toBeVisible();
    expect(screen.queryByLabelText("Contexte coach")).not.toBeInTheDocument();
  });
});
