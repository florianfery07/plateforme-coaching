import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Session from "../../src/components/calendar/Session";

const pilotEnabled = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock("@/lib/features/reliable-mutations-pilot", () => ({
  isReliableMutationsPilotEnabled: pilotEnabled,
}));

vi.mock("@/services/calendar-sessions-repository", () => ({
  calendarFeedbackService: { save },
}));

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const session = {
  id: "session-1",
  blocks: [],
  category: "Endurance",
  date: "2026-08-16",
  description: "Synthetic local session",
  expectedRpe: "5",
  expectedRpeGlobal: "5",
  expectedRpeSpecific: "4",
  feedback: {
    actualTime: "1h00",
    comment: "Ready",
    motivation: "8",
    pleasure: "4",
    rpe: "6",
    rpeGlobal: "6",
    rpeSpecific: "7",
    validated: false,
  },
  nonDone: { comment: "", fatigue: "", pain: "", reason: "", validated: false },
  title: "Synthetic session",
};

function renderSession() {
  const updateFeedback = vi.fn();
  const updateSession = vi.fn();
  render(
    <Session
      session={session}
      cpData={{}}
      updateFeedback={updateFeedback}
      updateNonDone={vi.fn()}
      updateSession={updateSession}
      updateCalendarWorkoutField={vi.fn()}
      isCoach={false}
    />,
  );
  return { updateFeedback, updateSession };
}

describe("Session feedback reliable mutation pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the existing legacy writer and its global-RPE mirror when disabled", () => {
    pilotEnabled.mockReturnValue(false);
    const { updateFeedback } = renderSession();
    const globalRpe = screen.getByLabelText("RPE global ressenti /10");

    fireEvent.blur(globalRpe, { target: { value: "6" } });

    expect(updateFeedback).toHaveBeenNthCalledWith(1, "session-1", "rpeGlobal", "6");
    expect(updateFeedback).toHaveBeenNthCalledWith(2, "session-1", "rpe", "6");
    expect(save).not.toHaveBeenCalled();
  });

  it("does not add an on-blur write to the legacy specific RPE field", () => {
    pilotEnabled.mockReturnValue(false);
    const { updateFeedback } = renderSession();
    const specificRpe = screen.getByLabelText("RPE spécifique ressenti /10");

    fireEvent.change(specificRpe, { target: { value: "8" } });
    fireEvent.blur(specificRpe, { target: { value: "8" } });

    expect(updateFeedback).toHaveBeenCalledTimes(1);
    expect(updateFeedback).toHaveBeenCalledWith("session-1", "rpeSpecific", "8");
    expect(save).not.toHaveBeenCalled();
  });

  it("uses one targeted persistence write with no parent global reload path when enabled", async () => {
    pilotEnabled.mockReturnValue(true);
    save.mockResolvedValue({ workout_id: "session-1" });
    const { updateFeedback, updateSession } = renderSession();
    const globalRpe = screen.getByLabelText("RPE global ressenti /10");

    fireEvent.change(globalRpe, { target: { value: "6" } });
    fireEvent.blur(globalRpe, { target: { value: "6" } });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      workoutId: "session-1",
      feedback: expect.objectContaining({ rpe: "6", rpeGlobal: "6" }),
    }), expect.any(AbortSignal));
    expect(updateFeedback).not.toHaveBeenCalled();
    expect(updateSession).toHaveBeenCalled();
  });

  it("saves a specific feedback field only on blur in the pilot", async () => {
    pilotEnabled.mockReturnValue(true);
    save.mockResolvedValue({ workout_id: "session-1" });
    const { updateFeedback } = renderSession();
    const specificRpe = screen.getByLabelText("RPE spécifique ressenti /10");

    fireEvent.change(specificRpe, { target: { value: "8" } });
    expect(save).not.toHaveBeenCalled();
    fireEvent.blur(specificRpe, { target: { value: "8" } });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      feedback: expect.objectContaining({ rpeSpecific: "8" }),
      workoutId: "session-1",
    }), expect.any(AbortSignal));
    expect(updateFeedback).not.toHaveBeenCalled();
  });

  it("keeps validation on the untouched legacy atomicity boundary", () => {
    pilotEnabled.mockReturnValue(true);
    const { updateFeedback } = renderSession();
    const validation = screen.getByRole("button", { name: "Valider séance réalisée" });

    fireEvent.click(validation);

    expect(updateFeedback).toHaveBeenCalledWith("session-1", "validated", true);
    expect(save).not.toHaveBeenCalled();
  });

  it("rolls back a failed pilot write and shows a safe error", async () => {
    pilotEnabled.mockReturnValue(true);
    save.mockRejectedValue({ code: "42501", message: "sensitive implementation detail" });
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const { updateFeedback, updateSession } = renderSession();
    const globalRpe = screen.getByLabelText("RPE global ressenti /10");

    fireEvent.change(globalRpe, { target: { value: "8" } });
    fireEvent.blur(globalRpe, { target: { value: "8" } });

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Impossible d'enregistrer le retour. Réessaie."));
    expect(updateFeedback).not.toHaveBeenCalled();
    expect(updateSession).toHaveBeenCalledTimes(3);
  });
});
