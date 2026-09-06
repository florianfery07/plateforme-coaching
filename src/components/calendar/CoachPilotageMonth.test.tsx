import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const archiveCycle = vi.fn();
const saveCycle = vi.fn();

vi.mock("@/services/pilotage-timeline", () => ({
  createPilotageTimelineService: () => ({
    archiveCycle,
    archiveMilestone: vi.fn(),
    get,
    saveCycle,
    saveMilestone: vi.fn(),
  }),
  createPilotageTimelineSupabaseRepository: vi.fn(),
}));
vi.mock("@/lib/supabase-typed", () => ({ createTypedSupabaseClient: vi.fn() }));
vi.mock("@/components/calendar/QuickLibrary", () => ({ default: () => <div>Bibliothèque contextuelle</div> }));
vi.mock("@/components/calendar/Session", () => ({ default: ({ session }: { session: { title: string } }) => <div>Détail séance {session.title}</div> }));
vi.mock("@/components/calendar/Proposal", () => ({ default: () => <div>Détail proposition</div> }));
vi.mock("@/components/calendar/DayView", () => ({ default: () => <div>Détail jour</div> }));

import CoachPilotageMonth from "./CoachPilotageMonth";

afterEach(() => {
  cleanup();
  get.mockReset();
  archiveCycle.mockReset();
  saveCycle.mockReset();
});

const selectedDate = new Date(2026, 8, 10);
const sessions = [{ id: "workout-1", date: "2026-09-10", title: "Endurance", category: "Route", feedback: {}, nonDone: {} }];

function renderMonth() {
  get.mockResolvedValue({
    legacyAthleteId: "athlete-1",
    cycles: [{ id: "cycle-1", name: "Préparation générale", startsOn: "2026-09-01", endsOn: "2026-09-21", colorKey: "blue", intent: "Socle", goalVersionId: null, revision: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" }],
    milestones: [{ id: "milestone-1", kind: "goal", title: "France CX", scheduledFor: "2026-09-12", details: "Objectif principal", goalVersionId: "90000000-0000-0000-0000-000000000001", goalSummary: { versionId: "90000000-0000-0000-0000-000000000001", shortGoal: "France CX", mediumGoal: null, longGoal: null, acceptedAt: "2026-09-01T00:00:00Z" }, revision: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" }],
  });
  return render(<CoachPilotageMonth
    activeId="athlete-1"
    activeSessions={sessions}
    addRestDay={vi.fn()}
    athleteActive={{ name: "Camille", calendarName: "Calendrier de Camille" }}
    cpData={{}}
    goalsV2State={{ current: { versionId: "90000000-0000-0000-0000-000000000001", shortGoal: "France CX" } }}
    onCreateSession={vi.fn()}
    onShowWeek={vi.fn()}
    planningTargetType="athlete"
    proposalsFor={() => []}
    selectedDate={selectedDate}
    sessions={{ "athlete-1": sessions }}
    sessionsFor={(date: Date) => sessions.filter((session) => session.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`)}
    setSelectedDate={vi.fn()}
  />);
}

describe("CoachPilotageMonth", () => {
  it("keeps real dates primary and shows the temporal cycle and linked Goals V2 milestone", async () => {
    renderMonth();

    await waitFor(() => expect(screen.getAllByText("Préparation générale").length).toBeGreaterThan(0));
    expect(screen.getAllByText("France CX").length).toBeGreaterThan(0);
    expect(screen.getAllByText("S37").length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith("athlete-1", "2026-09-01", "2026-09-30");
  });

  it("opens the contextual goal details without leaving the month", async () => {
    renderMonth();

    await waitFor(() => expect(screen.getAllByText("France CX").length).toBeGreaterThan(0));
    const milestoneButton = screen
      .getAllByText("France CX")
      .map((element) => element.closest("button"))
      .find((button) => button?.getAttribute("aria-pressed") === "false");
    fireEvent.click(milestoneButton!);

    expect(screen.getByText("Objectif V2 validé")).toBeVisible();
    expect(screen.getAllByText("Structure du mois").length).toBeGreaterThan(0);
  });

  it("saves a new cycle through the targeted timeline mutation then refreshes only the timeline", async () => {
    saveCycle.mockResolvedValue({ changed: true, id: "90000000-0000-0000-0000-000000000099", kind: "success", revision: 1 });
    renderMonth();

    await waitFor(() => expect(screen.getAllByText("Préparation générale").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un cycle" }));
    fireEvent.change(screen.getByLabelText("Nom du cycle"), { target: { value: "Affûtage" } });
    fireEvent.change(screen.getByLabelText("Début"), { target: { value: "2026-09-22" } });
    fireEvent.change(screen.getByLabelText("Fin"), { target: { value: "2026-09-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le cycle" }));

    await waitFor(() => expect(saveCycle).toHaveBeenCalledWith(expect.objectContaining({
      colorKey: "blue",
      endsOn: "2026-09-28",
      legacyAthleteId: "athlete-1",
      name: "Affûtage",
      startsOn: "2026-09-22",
    })));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("shows a safe error when an archive cannot be confirmed", async () => {
    archiveCycle.mockResolvedValue({ kind: "error", message: "Vous n’êtes pas autorisé à modifier ce pilotage." });
    renderMonth();

    await waitFor(() => expect(screen.getAllByText("Préparation générale").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Préparation générale")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Archiver le cycle" }));

    expect(await screen.findByText("Impossible d’archiver cet élément de pilotage. Réessayez ou actualisez la page.")).toBeVisible();
  });
});
