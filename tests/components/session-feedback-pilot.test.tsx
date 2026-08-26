import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Session from "../../src/components/calendar/Session";

const pilotEnabled = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
const complete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/features/reliable-mutations-pilot", () => ({
  isReliableMutationsPilotEnabled: pilotEnabled,
}));

vi.mock("@/services/calendar-sessions-repository", () => ({
  calendarFeedbackService: { save },
  calendarWorkoutCompletionService: { complete },
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
    pilotEnabled.mockReturnValue(false);
    const { updateFeedback } = renderSession();
    const validation = screen.getByRole("button", { name: "Valider séance réalisée" });

    fireEvent.click(validation);

    expect(updateFeedback).toHaveBeenCalledWith("session-1", "validated", true);
    expect(save).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("uses one atomic completion and no legacy writer when the pilot is enabled", async () => {
    pilotEnabled.mockReturnValue(true);
    complete.mockResolvedValue({
      completed: true,
      feedback: { ...session.feedback, validated: true },
      workoutId: "session-1",
    });
    const { updateFeedback, updateSession } = renderSession();

    fireEvent.click(screen.getByRole("button", { name: "Valider séance réalisée" }));

    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({
      workoutId: "session-1",
      feedback: expect.objectContaining({ comment: "Ready" }),
    }), expect.any(AbortSignal));
    expect(updateFeedback).not.toHaveBeenCalled();
    expect(updateSession).toHaveBeenCalledTimes(1);
    const patchedSessions = updateSession.mock.calls[0][0]([session]);
    expect(patchedSessions[0]).toMatchObject({
      feedback: { validated: true },
      nonDone: { validated: false },
    });
  });

  it("locks the completion action while its single RPC is pending", async () => {
    pilotEnabled.mockReturnValue(true);
    let resolveCompletion: (value: unknown) => void;
    complete.mockReturnValue(new Promise((resolve) => {
      resolveCompletion = resolve;
    }));
    const { updateFeedback, updateSession } = renderSession();
    const completion = screen.getByRole("button", { name: "Valider séance réalisée" });

    fireEvent.click(completion);

    await waitFor(() => expect(completion).toBeDisabled());
    fireEvent.click(completion);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(updateFeedback).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();

    resolveCompletion!({
      completed: true,
      feedback: { ...session.feedback, validated: true },
      workoutId: "session-1",
    });
  });

  it("rejects a double click and keeps the local session unchanged after an RPC failure", async () => {
    pilotEnabled.mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    complete.mockRejectedValue({ code: "42501" });
    const { updateFeedback, updateSession } = renderSession();
    const completion = screen.getByRole("button", { name: "Valider séance réalisée" });

    fireEvent.click(completion);
    fireEvent.click(completion);

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Impossible de valider la séance. Réessaie."));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(updateFeedback).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
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

  it("keeps the legacy adjustment writer when the pilot is disabled", () => {
    pilotEnabled.mockReturnValue(false);
    const updateCalendarWorkoutField = vi.fn();
    render(
      <Session
        session={session}
        cpData={{}}
        updateFeedback={vi.fn()}
        updateNonDone={vi.fn()}
        updateSession={vi.fn()}
        updateCalendarWorkoutField={updateCalendarWorkoutField}
        isCoach
      />,
    );

    fireEvent.change(screen.getByLabelText("Durée spécifique retenue"), {
      target: { value: "45 min" },
    });

    expect(updateCalendarWorkoutField).toHaveBeenCalledWith(
      "session-1",
      "adjustedSpecificDuration",
      "45 min",
    );
  });

  it("saves one confirmed adjustment only on blur in the pilot", async () => {
    pilotEnabled.mockReturnValue(true);
    const updateCalendarWorkoutField = vi.fn().mockResolvedValue({
      data: { ...session, adjustedSpecificDuration: "45 min" },
      state: "success",
    });
    const updateSession = vi.fn();
    render(
      <Session
        session={session}
        cpData={{}}
        updateFeedback={vi.fn()}
        updateNonDone={vi.fn()}
        updateSession={updateSession}
        updateCalendarWorkoutField={updateCalendarWorkoutField}
        isCoach
      />,
    );
    const adjustment = screen.getByLabelText("Durée spécifique retenue");

    fireEvent.change(adjustment, { target: { value: "45 min" } });
    expect(updateCalendarWorkoutField).not.toHaveBeenCalled();
    fireEvent.blur(adjustment);

    await waitFor(() => expect(updateCalendarWorkoutField).toHaveBeenCalledTimes(1));
    expect(updateCalendarWorkoutField).toHaveBeenCalledWith(
      "session-1",
      "adjustedSpecificDuration",
      "45 min",
    );
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("does not invoke the parent writer while an adjustment is pending", () => {
    pilotEnabled.mockReturnValue(true);
    const updateCalendarWorkoutField = vi.fn();
    render(
      <Session
        session={session}
        cpData={{}}
        updateFeedback={vi.fn()}
        updateNonDone={vi.fn()}
        updateSession={vi.fn()}
        updateCalendarWorkoutField={updateCalendarWorkoutField}
        adjustmentPending
        isCoach
      />,
    );
    const adjustment = screen.getByLabelText("Durée spécifique retenue");

    fireEvent.change(adjustment, { target: { value: "45 min" } });
    fireEvent.blur(adjustment);

    expect(updateCalendarWorkoutField).not.toHaveBeenCalled();
  });

  it("restores the visible adjustment after a failed pilot write", async () => {
    pilotEnabled.mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const updateCalendarWorkoutField = vi.fn().mockResolvedValue({
      data: null,
      state: "error",
    });
    render(
      <Session
        session={{ ...session, adjustedSpecificDuration: "30 min" }}
        cpData={{}}
        updateFeedback={vi.fn()}
        updateNonDone={vi.fn()}
        updateSession={vi.fn()}
        updateCalendarWorkoutField={updateCalendarWorkoutField}
        isCoach
      />,
    );
    const adjustment = screen.getByLabelText("Durée spécifique retenue");

    fireEvent.change(adjustment, { target: { value: "45 min" } });
    fireEvent.blur(adjustment);

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Impossible d'enregistrer l'ajustement. Réessaie."));
    expect(adjustment).toHaveValue("30 min");
  });
});
