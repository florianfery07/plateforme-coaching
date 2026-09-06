import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

vi.mock("@/components/calendar/QuickLibrary", () => ({
  default: ({ selectedDate }: { selectedDate: Date }) => (
    <div>Bibliothèque contextuelle {localDateKey(selectedDate)}</div>
  ),
}));
vi.mock("@/components/calendar/Session", () => ({
  default: ({ session }: { session: { title: string } }) => <div>Détail séance {session.title}</div>,
}));
vi.mock("@/components/calendar/Proposal", () => ({
  default: ({ proposal }: { proposal: { title: string } }) => <div>Détail proposition {proposal.title}</div>,
}));
vi.mock("@/components/calendar/DayView", () => ({
  default: () => <div>Détail complet du jour</div>,
}));
vi.mock("@/components/calendar/CalendarWeekSummary", () => ({
  default: () => <div>Synthèse hebdomadaire</div>,
}));
vi.mock("@/components/calendar/WeekPlanningTool", () => ({
  default: () => <div>Prévision de charge</div>,
}));
vi.mock("@/components/calendar/CoachPilotageMonth", () => ({
  default: ({ onShowWeek }: { onShowWeek: () => void }) => <div>Vue mois Pilotage <button type="button" onClick={onShowWeek}>Retour semaine</button></div>,
}));

import CoachPilotageWorkspace from "./CoachPilotageWorkspace";

afterEach(cleanup);

const monday = new Date(2026, 7, 3);
const sessions = [
  {
    id: "session-a",
    date: "2026-08-03",
    title: "Endurance",
    category: "Route",
    subcategory: "Endurance",
    totalDuration: "2h00",
    feedback: {},
    nonDone: {},
  },
  {
    id: "session-b",
    date: "2026-08-03",
    title: "PPG",
    category: "Préparation physique",
    totalDuration: "30 min",
    feedback: {},
    nonDone: {},
  },
];

function renderWorkspace(overrides = {}) {
  const props = {
    activeId: "athlete-1",
    activeSessions: sessions,
    athleteActive: { calendarName: "Calendrier de Camille", name: "Camille" },
    addRestDay: vi.fn(),
    athletes: [],
    cpData: {},
    importWorkout: vi.fn(),
    planningTargetType: "athlete",
    proposalsFor: () => [],
    selectedDate: monday,
    selectedGroup: null,
    selectedGroupMembers: [],
    sessions: { "athlete-1": sessions },
    sessionsFor: (date: Date) => sessions.filter((session) => session.date === localDateKey(date)),
    setMode: vi.fn(),
    setProposals: vi.fn(),
    setSelectedDate: vi.fn(),
    setWeekNotes: vi.fn(),
    subcategories: [],
    updateCalendarWorkoutField: vi.fn(),
    updateFeedback: vi.fn(),
    updateNonDone: vi.fn(),
    updateSession: vi.fn(),
    updateWeekNote: vi.fn(),
    updateWeekPlanning: vi.fn(),
    weekNotes: {},
    weekPlanning: {},
    onCreateSession: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<CoachPilotageWorkspace {...props} />) };
}

describe("CoachPilotageWorkspace", () => {
  it("keeps the calendar week central and presents multiple compact sessions on the same day", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "Pilotage" })).toBeVisible();
    expect(screen.getAllByText("Endurance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PPG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Action attendue").length).toBeGreaterThan(0);
    expect(screen.getByText("Synthèse hebdomadaire")).toBeVisible();
  });

  it("opens the compact library context for the selected day instead of rendering it permanently", () => {
    const { props } = renderWorkspace();

    expect(screen.queryByText(/Bibliothèque contextuelle/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Programmer" })[0]);

    expect(props.setSelectedDate).toHaveBeenCalledWith(monday);
    expect(screen.getByText("Bibliothèque contextuelle 2026-08-03")).toBeVisible();
  });

  it("keeps session details contextual and preserves the existing create action", () => {
    const { props } = renderWorkspace();

    fireEvent.click(screen.getAllByRole("button", { name: /Endurance/ })[0]);
    expect(screen.getByText("Détail séance Endurance")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Créer une séance" }));
    expect(props.onCreateSession).toHaveBeenCalledTimes(1);
  });

  it("explains that a group is a programming target and never presents an invented aggregate calendar", () => {
    renderWorkspace({
      planningTargetType: "group",
      selectedGroup: { id: "group-1", name: "Compétition" },
      selectedGroupMembers: [{ athlete_id: "athlete-1" }, { athlete_id: "athlete-2" }],
    });

    expect(screen.getByText(/Ciblage de programmation/)).toBeVisible();
    expect(screen.getByText(/Le calendrier conserve la lecture de/)).toBeVisible();
  });

  it("switches to the month workspace while preserving the existing weekly workspace", () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole("tab", { name: "Mois" }));
    expect(screen.getByText("Vue mois Pilotage")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retour semaine" }));
    expect(screen.getByRole("heading", { name: "Pilotage" })).toBeVisible();
  });
});
