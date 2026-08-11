import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ManagementPage from "./ManagementPage";

const athletes = [
  { id: "athlete-1", name: "Athlete One", active: true },
  { id: "athlete-2", name: "Athlete Two", active: true },
];

function renderPage(deleteAthlete = vi.fn().mockResolvedValue(true)) {
  render(
    <ManagementPage
      athletes={athletes}
      newAthlete=""
      setNewAthlete={vi.fn()}
      addAthlete={vi.fn()}
      deleteAthlete={deleteAthlete}
      updateAthlete={vi.fn()}
      setAthleteActive={vi.fn()}
      athleteLifecycleV2Enabled
      athleteGroups={[]}
      athleteGroupMembers={[]}
      newGroupName=""
      setNewGroupName={vi.fn()}
      addAthleteGroup={vi.fn()}
      renameAthleteGroup={vi.fn()}
      deleteAthleteGroup={vi.fn()}
      toggleAthleteGroupMember={vi.fn()}
    />,
  );
}

describe("ManagementPage athlete lifecycle V2", () => {
  it("uses archive wording and submits only one pilot operation on a double click", async () => {
    const deleteAthlete = vi.fn().mockResolvedValue(true);
    renderPage(deleteAthlete);

    fireEvent.click(screen.getByRole("button", { name: "Archiver cet athlète" }));
    const archive = screen.getByRole("button", { name: "Archiver" });
    fireEvent.click(archive);
    fireEvent.click(archive);

    expect(deleteAthlete).toHaveBeenCalledTimes(1);
    expect(deleteAthlete).toHaveBeenCalledWith("athlete-1");
  });

  it("keeps the existing destructive wording when the pilot flag is disabled", () => {
    render(
      <ManagementPage
        athletes={athletes}
        newAthlete=""
        setNewAthlete={vi.fn()}
        addAthlete={vi.fn()}
        deleteAthlete={vi.fn()}
        updateAthlete={vi.fn()}
        setAthleteActive={vi.fn()}
        athleteGroups={[]}
        athleteGroupMembers={[]}
        newGroupName=""
        setNewGroupName={vi.fn()}
        addAthleteGroup={vi.fn()}
        renameAthleteGroup={vi.fn()}
        deleteAthleteGroup={vi.fn()}
        toggleAthleteGroupMember={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Supprimer cet athlète" })).toBeVisible();
  });
});
