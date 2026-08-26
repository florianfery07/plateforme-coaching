import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import Proposal from "./Proposal";

const proposal = {
  id: "13000000-0000-0000-0000-000000000151",
  date: "2026-08-26",
  message: "Synthetic proposal",
  status: "À traiter",
  title: "Course locale",
  type: "Course à ajouter",
};

describe("Proposal scheduling action", () => {
  afterEach(cleanup);

  it("keeps the legacy callback available when the reliable pilot is not pending", () => {
    const programProposal = vi.fn();
    render(
      <Proposal
        proposal={proposal}
        setProposals={vi.fn()}
        programProposal={programProposal}
        isCoach
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Programmer" }));
    expect(programProposal).toHaveBeenCalledWith(proposal);
  });

  it("prevents a second scheduling click while the reliable mutation is pending", () => {
    const programProposal = vi.fn();
    render(
      <Proposal
        proposal={proposal}
        setProposals={vi.fn()}
        programProposal={programProposal}
        programPending
        isCoach
      />,
    );

    const schedule = screen.getByRole("button", { name: "Programmer" });
    expect(schedule).toBeDisabled();
    fireEvent.click(schedule);
    expect(programProposal).not.toHaveBeenCalled();
  });
});
