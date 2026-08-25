import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CalendarPageOld from "../../src/components/calendar/CalendarPageOld";
import { WEEK_NOTE_DEBOUNCE_MS } from "../../src/hooks/use-week-note-autosave";
import { weekInfo } from "../../src/lib/trainingUtils";

const pilotEnabled = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock("@/lib/features", () => ({
  isReliableMutationsPilotEnabled: pilotEnabled,
}));

vi.mock("@/services/week-notes/week-note-client-service", () => ({
  weekNoteService: { save },
}));

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

vi.mock("@/components/calendar/CalendarToolbar", () => ({ default: () => null }));
vi.mock("@/components/calendar/YearView", () => ({ default: () => null }));
vi.mock("@/components/calendar/MonthView", () => ({ default: () => null }));
vi.mock("@/components/calendar/DayView", () => ({ default: () => null }));
vi.mock("@/components/calendar/QuickLibrary", () => ({ default: () => null }));
vi.mock("@/components/calendar/AthleteGoalUpdateBanner", () => ({ default: () => null }));
vi.mock("@/components/calendar/AthleteNotificationsBanner", () => ({ default: () => null }));
vi.mock("@/components/calendar/AthleteBehaviorAnalysis", () => ({ default: () => null }));

const selectedDate = new Date("2026-08-12T12:00:00");
const selectedYear = selectedDate.getFullYear();
const selectedWeek = weekInfo(selectedDate).label;

function renderCalendar({ updateWeekNote = vi.fn(), setWeekNotes = vi.fn() } = {}) {
  render(
    <CalendarPageOld
      activeId="athlete-1"
      activeSessions={[]}
      athleteActive={{ id: "athlete-1", name: "Athlete" }}
      categories={[]}
      isCoach
      mode="none"
      selectedDate={selectedDate}
      sessions={[]}
      setWeekNotes={setWeekNotes}
      subcategories={[]}
      updateWeekNote={updateWeekNote}
      updateWeekPlanning={vi.fn()}
      weekNotes={{}}
      weekPlanning={{}}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /outil de charge prévisionnel/i }));
  return { setWeekNotes, updateWeekNote };
}

describe("calendar weekly note reliable mutation pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    save.mockResolvedValue({ athleteId: "athlete-1", note: "draft", updatedAt: null, week: selectedWeek, year: selectedYear });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps the legacy writer unchanged when the pilot is disabled", () => {
    pilotEnabled.mockReturnValue(false);
    const { updateWeekNote } = renderCalendar();

    fireEvent.change(screen.getByPlaceholderText(/bloc PMA/i), {
      target: { value: "Legacy weekly note" },
    });

    expect(updateWeekNote).toHaveBeenCalledWith(selectedYear, selectedWeek, "Legacy weekly note");
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps rapid edits local and persists only the final draft through the existing service", async () => {
    vi.useFakeTimers();
    pilotEnabled.mockReturnValue(true);
    const { setWeekNotes, updateWeekNote } = renderCalendar();
    const textarea = screen.getByPlaceholderText(/bloc PMA/i);

    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.change(textarea, { target: { value: "ab" } });
    fireEvent.change(textarea, { target: { value: "abc" } });

    expect(updateWeekNote).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(setWeekNotes).toHaveBeenCalledTimes(3);
    expect(setWeekNotes.mock.calls.at(-1)?.[0]({})).toEqual({
      [`athlete-1-${selectedYear}-${selectedWeek}`]: "abc",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      {
        athleteId: "athlete-1",
        note: "abc",
        week: selectedWeek,
        year: selectedYear,
      },
      expect.any(AbortSignal),
    );
  });

  it("flushes one pending pilot draft on blur without invoking the legacy writer", async () => {
    vi.useFakeTimers();
    pilotEnabled.mockReturnValue(true);
    const { updateWeekNote } = renderCalendar();
    const textarea = screen.getByPlaceholderText(/bloc PMA/i);

    fireEvent.change(textarea, { target: { value: "Blurred note" } });
    fireEvent.blur(textarea);
    await Promise.resolve();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ note: "Blurred note" });
    expect(updateWeekNote).not.toHaveBeenCalled();
  });

  it("exposes the existing pending state without saving through the legacy writer", () => {
    pilotEnabled.mockReturnValue(true);
    save.mockReturnValue(new Promise(() => undefined));
    const { updateWeekNote } = renderCalendar();

    fireEvent.change(screen.getByPlaceholderText(/bloc PMA/i), {
      target: { value: "Pending note" },
    });

    expect(screen.getByRole("status")).toHaveTextContent("Enregistrement...");
    expect(updateWeekNote).not.toHaveBeenCalled();
  });

  it("shows a safe retry after a confirmed pilot error", async () => {
    vi.useFakeTimers();
    pilotEnabled.mockReturnValue(true);
    save.mockRejectedValue({ kind: "permission", message: "server detail", retryable: false });
    renderCalendar();

    fireEvent.change(screen.getByPlaceholderText(/bloc PMA/i), {
      target: { value: "Rejected note" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEEK_NOTE_DEBOUNCE_MS);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Echec de l'enregistrement");
    expect(screen.getByRole("alert")).not.toHaveTextContent("server detail");
    expect(screen.getByRole("button", { name: "Reessayer" })).toBeEnabled();
  });
});
