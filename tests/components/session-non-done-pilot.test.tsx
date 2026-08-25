import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Session from "../../src/components/calendar/Session";

const pilotEnabled = vi.hoisted(() => vi.fn());

vi.mock("@/lib/features/reliable-mutations-pilot", () => ({
  isReliableMutationsPilotEnabled: pilotEnabled,
}));

vi.mock("@/services/calendar-sessions-repository", () => ({
  calendarFeedbackService: { save: vi.fn() },
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
    actualTime: "",
    comment: "",
    motivation: "",
    pleasure: "",
    rpe: "",
    rpeGlobal: "",
    rpeSpecific: "",
    validated: false,
  },
  nonDone: { comment: "", fatigue: "", pain: "", reason: "", validated: false },
  title: "Synthetic session",
};

function renderSession({ nonDonePending = false, updateNonDone = vi.fn() } = {}) {
  render(
    <Session
      session={session}
      cpData={{}}
      updateFeedback={vi.fn()}
      updateNonDone={updateNonDone}
      updateSession={vi.fn()}
      updateCalendarWorkoutField={vi.fn()}
      nonDonePending={nonDonePending}
      isCoach={false}
    />,
  );
  return updateNonDone;
}

describe("Session non-done reliable mutation pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("keeps the legacy per-field writer when the pilot is disabled", () => {
    pilotEnabled.mockReturnValue(false);
    const updateNonDone = renderSession();

    fireEvent.change(screen.getByLabelText("Commentaire optionnel"), {
      target: { value: "Trop fatigué" },
    });

    expect(updateNonDone).toHaveBeenCalledWith("session-1", "comment", "Trop fatigué");
  });

  it("keeps edits local and submits one complete confirmed payload in the pilot", async () => {
    pilotEnabled.mockReturnValue(true);
    const updateNonDone = vi.fn().mockResolvedValue({
      data: {
        ...session,
        nonDone: {
          comment: "Trop fatigué",
          fatigue: "7",
          pain: "",
          reason: "Fatigue",
          validated: true,
        },
      },
      state: "success",
    });
    renderSession({ updateNonDone });

    fireEvent.change(screen.getByLabelText("Raison"), { target: { value: "Fatigue" } });
    fireEvent.change(screen.getByLabelText("Fatigue optionnelle"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Commentaire optionnel"), {
      target: { value: "Trop fatigué" },
    });

    expect(updateNonDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Valider séance non faite" }));

    await waitFor(() => expect(updateNonDone).toHaveBeenCalledTimes(1));
    expect(updateNonDone).toHaveBeenCalledWith("session-1", "commit", {
      comment: "Trop fatigué",
      fatigue: "7",
      pain: "",
      reason: "Fatigue",
      validated: true,
    });
  });

  it("prevents a second submission while the pilot mutation is pending", () => {
    pilotEnabled.mockReturnValue(true);
    const updateNonDone = renderSession({ nonDonePending: true });
    const button = screen.getByRole("button", { name: "Valider séance non faite" });

    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(updateNonDone).not.toHaveBeenCalled();
  });

  it("submits only once when the validation action is double-clicked", () => {
    pilotEnabled.mockReturnValue(true);
    const updateNonDone = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderSession({ updateNonDone });
    const button = screen.getByRole("button", { name: "Valider séance non faite" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(updateNonDone).toHaveBeenCalledTimes(1);
  });

  it("rolls a failed pilot submission back to its confirmed values with a safe error", async () => {
    pilotEnabled.mockReturnValue(true);
    const updateNonDone = vi.fn().mockResolvedValue({ state: "error" });
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    renderSession({ updateNonDone });

    fireEvent.change(screen.getByLabelText("Commentaire optionnel"), {
      target: { value: "Sensitive server detail" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider séance non faite" }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Impossible d'enregistrer la justification. Réessaie."));
    expect(screen.getByLabelText("Commentaire optionnel")).toHaveValue("");
  });
});
