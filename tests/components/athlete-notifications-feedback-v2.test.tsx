import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AthleteNotificationsBanner from "../../src/components/calendar/AthleteNotificationsBanner";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const missingSession = {
  id: "session-1",
  athleteSeenAt: "2026-09-01T00:00:00.000Z",
  category: "Endurance",
  date: "2026-09-01",
  feedback: { actualTime: "", comment: "", motivation: "", pleasure: "", rpe: "", rpeGlobal: "", rpeSpecific: "", sensation: "", validated: false },
  nonDone: { validated: false },
  title: "Endurance",
};

describe("AthleteNotificationsBanner feedback V2", () => {
  afterEach(cleanup);

  it("takes the athlete directly to an incomplete or missing V2 feedback", () => {
    const onCompleteSession = vi.fn();
    render(<AthleteNotificationsBanner sessions={[missingSession] as never} onCompleteSession={onCompleteSession} />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByRole("button", { name: "Compléter" }));

    expect(onCompleteSession).toHaveBeenCalledWith(missingSession);
  });

  it("leaves the legacy notification behavior untouched without the V2 callback", () => {
    render(<AthleteNotificationsBanner sessions={[missingSession] as never} onCompleteSession={undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.queryByRole("button", { name: "Compléter" })).not.toBeInTheDocument();
  });
});
