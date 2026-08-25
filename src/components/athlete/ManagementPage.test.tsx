import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ManagementPage from "./ManagementPage";

const athletes = [
  { id: "athlete-1", name: "Athlete One", active: true },
  { id: "athlete-2", name: "Athlete Two", active: true },
];

type GroupsPageOptions = {
  addAthleteGroup?: ReturnType<typeof vi.fn>;
  athleteGroupCreatePending?: boolean;
  athleteGroupMemberPendingKeys?: string[];
  athleteGroupMemberPilotEnabled?: boolean;
  newGroupName?: string;
  toggleAthleteGroupMember?: ReturnType<typeof vi.fn>;
};

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

function renderGroupsPage({
  addAthleteGroup = vi.fn(),
  athleteGroupCreatePending = false,
  athleteGroupMemberPendingKeys = [],
  athleteGroupMemberPilotEnabled = false,
  newGroupName = "",
  toggleAthleteGroupMember = vi.fn(),
}: GroupsPageOptions = {}) {
  render(
    <ManagementPage
      athletes={athletes}
      newAthlete=""
      setNewAthlete={vi.fn()}
      addAthlete={vi.fn()}
      deleteAthlete={vi.fn()}
      updateAthlete={vi.fn()}
      setAthleteActive={vi.fn()}
      athleteGroups={[{ id: "group-1", name: "Synthetic group" }] as unknown as never[]}
      athleteGroupMembers={[
        { athlete_id: "athlete-1", group_id: "group-1" },
      ] as unknown as never[]}
      athleteGroupMemberPilotEnabled={athleteGroupMemberPilotEnabled}
      athleteGroupMemberPendingKeys={athleteGroupMemberPendingKeys as unknown as never[]}
      athleteGroupCreatePending={athleteGroupCreatePending}
      newGroupName={newGroupName}
      setNewGroupName={vi.fn()}
      addAthleteGroup={addAthleteGroup}
      renameAthleteGroup={vi.fn()}
      deleteAthleteGroup={vi.fn()}
      toggleAthleteGroupMember={toggleAthleteGroupMember}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Groupes" }));
  return { addAthleteGroup, toggleAthleteGroupMember };
}

describe("ManagementPage athlete lifecycle V2", () => {
  afterEach(cleanup);

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

  it("keeps the existing group membership callback available when the pilot is disabled", () => {
    const { toggleAthleteGroupMember } = renderGroupsPage();

    fireEvent.click(screen.getByRole("checkbox", { name: "Athlete One" }));

    expect(toggleAthleteGroupMember).toHaveBeenCalledWith("group-1", "athlete-1", false);
  });

  it("blocks only the pending group-member checkbox in the reliable-mutation pilot", () => {
    const { toggleAthleteGroupMember } = renderGroupsPage({
      athleteGroupMemberPilotEnabled: true,
      athleteGroupMemberPendingKeys: ["group-1:athlete-1"],
    });

    expect(screen.getByRole("checkbox", { name: "Athlete One" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Athlete Two" })).toBeEnabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Athlete Two" }));

    expect(toggleAthleteGroupMember).toHaveBeenCalledWith("group-1", "athlete-2", true);
  });

  it("keeps the existing group-creation action available when no pilot mutation is pending", () => {
    const addAthleteGroup = vi.fn();
    renderGroupsPage({ addAthleteGroup, newGroupName: "Synthetic group" });

    fireEvent.click(screen.getByRole("button", { name: "+ Créer" }));

    expect(addAthleteGroup).toHaveBeenCalledTimes(1);
  });

  it("prevents a duplicate group creation while the reliable mutation is pending", () => {
    const addAthleteGroup = vi.fn();
    renderGroupsPage({
      addAthleteGroup,
      athleteGroupCreatePending: true,
      newGroupName: "Synthetic group",
    });

    const create = screen.getByRole("button", { name: "+ Créer" });
    expect(create).toBeDisabled();
    fireEvent.click(create);

    expect(addAthleteGroup).not.toHaveBeenCalled();
  });
});
