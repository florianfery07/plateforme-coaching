import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AthleteSessionFeedbackV2 from "../../src/components/calendar/AthleteSessionFeedbackV2";
import type { CalendarSession } from "../../src/services/calendar-sessions";

const saveDraft = vi.hoisted(() => vi.fn());
const complete = vi.hoisted(() => vi.fn());

vi.mock("@/services/calendar-sessions-repository", () => ({
  calendarFeedbackV2Service: { saveDraft, complete },
}));

function feedbackResult(completed: boolean, feedback = {}) {
  return {
    completed,
    workoutId: "session-1",
    feedback: {
      actualTime: "1h20",
      comment: "",
      motivation: "8",
      pleasure: "4",
      rpe: "7",
      rpeGlobal: "7",
      rpeSpecific: "",
      sensation: "5",
      updatedAt: "2026-09-06T12:00:00.000Z",
      validated: completed,
      ...feedback,
    },
  };
}

function session(overrides: Partial<CalendarSession> = {}): CalendarSession {
  return {
    athleteSeenAt: null,
    blocks: [],
    category: "Endurance",
    date: "2026-09-05",
    description: "Synthetic local session",
    expectedRpe: "6",
    expectedRpeGlobal: "6",
    expectedRpeSpecific: "",
    expectedSpecificDuration: "",
    adjustedSpecificDuration: "",
    feedback: {
      actualTime: "1h20",
      comment: "",
      motivation: "8",
      pleasure: "4",
      rpe: "7",
      rpeGlobal: "7",
      rpeSpecific: "",
      sensation: "5",
      updatedAt: "",
      validated: false,
    },
    id: "session-1",
    nonDone: { comment: "", fatigue: "", pain: "", reason: "", validated: false },
    sourceProposalId: null,
    subcategory: "",
    title: "Endurance 1h20",
    totalDuration: "1h20",
    ...overrides,
  };
}

function Harness({ initial = session() }: { initial?: CalendarSession }) {
  const [sessions, setSessions] = useState([initial]);
  return <AthleteSessionFeedbackV2 session={sessions[0]} updateSession={setSessions} />;
}

describe("AthleteSessionFeedbackV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraft.mockImplementation(async ({ feedback }: { feedback: CalendarSession["feedback"] }) => feedbackResult(false, feedback));
    complete.mockImplementation(async ({ feedback }: { feedback: CalendarSession["feedback"] }) => feedbackResult(true, feedback));
  });

  afterEach(cleanup);

  it("keeps the optional comment and hides specific RPE for a non-specific session", async () => {
    render(<Harness />);

    expect(screen.queryByRole("radiogroup", { name: /partie spécifique/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer mon retour" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer mon retour" }));

    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ requiresSpecific: false }), expect.any(AbortSignal));
  });

  it("persists an explicit draft and mirrors the selected global RPE locally", async () => {
    render(<Harness />);
    const globalRpe = screen.getByRole("radiogroup", { name: "Difficulté globale /10" });

    fireEvent.click(within(globalRpe).getByRole("radio", { name: "8" }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      feedback: expect.objectContaining({ rpe: "8", rpeGlobal: "8" }),
      workoutId: "session-1",
    }), expect.any(AbortSignal));
  });

  it("requires a specific RPE only when the planned specific duration is meaningful", () => {
    render(<Harness initial={session({ expectedRpeSpecific: "8", expectedSpecificDuration: "40 min", feedback: { ...session().feedback, rpeSpecific: "" } })} />);

    expect(screen.getByRole("radiogroup", { name: /partie spécifique/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer mon retour" })).toBeDisabled();
  });

  it("prevents a double finalization while the single atomic request is pending", async () => {
    let resolveCompletion: (value: ReturnType<typeof feedbackResult>) => void;
    complete.mockReturnValue(new Promise((resolve) => { resolveCompletion = resolve; }));
    render(<Harness />);
    const submit = screen.getByRole("button", { name: "Enregistrer mon retour" });

    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(complete).toHaveBeenCalledTimes(1);

    resolveCompletion!(feedbackResult(true));
  });

  it("locks all structured controls while a draft confirmation is pending", async () => {
    let resolveDraft: (value: ReturnType<typeof feedbackResult>) => void;
    saveDraft.mockReturnValue(new Promise((resolve) => { resolveDraft = resolve; }));
    render(<Harness />);

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Difficulté globale /10" })).getByRole("radio", { name: "8" }));

    await waitFor(() => expect(within(screen.getByRole("radiogroup", { name: "Difficulté globale /10" })).getByRole("radio", { name: "9" })).toBeDisabled());
    expect(within(screen.getByRole("radiogroup", { name: "Sensations pendant la séance" })).getByRole("radio", { name: "5: Très bonnes" })).toBeDisabled();
    expect(screen.getByLabelText("Heures réalisées")).toBeDisabled();
    expect(screen.getByLabelText("Motivation avant séance /10")).toBeDisabled();

    resolveDraft!(feedbackResult(false, { rpe: "8", rpeGlobal: "8" }));
  });

  it("rolls back a failed draft and exposes no server diagnostic", async () => {
    saveDraft.mockRejectedValue({ code: "42501", message: "sensitive implementation detail" });
    render(<Harness />);
    const globalRpe = screen.getByRole("radiogroup", { name: "Difficulté globale /10" });

    fireEvent.click(within(globalRpe).getByRole("radio", { name: "8" }));

    await waitFor(() => expect(screen.getByText("Impossible d’enregistrer le brouillon. Réessaie.")).toBeInTheDocument());
    expect(screen.queryByText(/sensitive implementation detail/i)).not.toBeInTheDocument();
    expect(within(globalRpe).getByRole("radio", { name: "7" })).toHaveAttribute("aria-checked", "true");
  });

  it("does not open a feedback form for a confirmed non-done session", () => {
    render(<Harness initial={session({ nonDone: { comment: "", fatigue: "", pain: "", reason: "Fatigue", validated: true } })} />);

    expect(screen.getByText(/aucun retour de séance n’est attendu/i)).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });
});
