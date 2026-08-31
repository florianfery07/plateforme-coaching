import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GoalState } from "@/services/goals-v2";

import { AthleteGoalsV2Panel, CoachGoalsV2Panel } from "./AthleteGoalsV2Panel";

const requestId = "20000000-0000-4000-8000-000000000011";
const athleteId = "10000000-0000-4000-8000-000000000011";

function state(overrides: Partial<GoalState> = {}): GoalState {
  return {
    legacyAthleteId: athleteId,
    current: null,
    history: [],
    openRequest: {
      requestId,
      status: "requested",
      requestedAt: "2026-08-30T10:00:00Z",
      updatedAt: "2026-08-30T10:00:00Z",
      reviewNote: null,
      latestVersion: null,
    },
    ...overrides,
  };
}

describe("Goals V2 pilot panels", () => {
  afterEach(cleanup);

  it("keeps the athlete workflow pending until the single confirmed V2 submission resolves", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve; }));
    render(<AthleteGoalsV2Panel state={state()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Court terme (~6 mois)"), { target: { value: "Course de printemps" } });
    const submit = screen.getByRole("button", { name: "Envoyer mes objectifs" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(requestId, expect.objectContaining({ shortGoal: "Course de printemps" }));
    expect(submit).toBeDisabled();

    resolveSubmit?.();
    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it("shows a safe error without exposing a server detail", async () => {
    render(<AthleteGoalsV2Panel state={state()} onSubmit={vi.fn().mockRejectedValue(new Error("La modification des objectifs a échoué."))} />);

    fireEvent.click(screen.getByRole("button", { name: "Envoyer mes objectifs" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La modification des objectifs a échoué.");
  });

  it("opens exactly one V2 request and never invokes a legacy callback", async () => {
    const onOpen = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachGoalsV2Panel
        state={state({ openRequest: null })}
        onOpen={onOpen}
        onCancel={vi.fn()}
        onAccept={vi.fn()}
        onRequestChanges={vi.fn()}
      />,
    );

    const open = screen.getByRole("button", { name: "Demander une mise à jour" });
    fireEvent.click(open);
    fireEvent.click(open);

    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
  });

  it("exposes acceptance and a reasoned revision request only for a submitted version", async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const onRequestChanges = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachGoalsV2Panel
        state={state({
          openRequest: {
            ...state().openRequest!,
            status: "submitted",
            latestVersion: {
              versionId: "30000000-0000-4000-8000-000000000011",
              requestId,
              requestStatus: "submitted",
              revisionNumber: 1,
              source: "athlete_submission",
              shortGoal: "Course",
              mediumGoal: null,
              longGoal: null,
              submittedAt: "2026-08-30T10:00:00Z",
              reviewOutcome: null,
              reviewedAt: null,
              reviewNote: null,
            },
          },
        })}
        onOpen={vi.fn()}
        onCancel={vi.fn()}
        onAccept={onAccept}
        onRequestChanges={onRequestChanges}
      />,
    );

    fireEvent.change(screen.getByLabelText("Retour au sportif (obligatoire pour demander des modifications)"), { target: { value: "Précisez le calendrier." } });
    fireEvent.click(screen.getByRole("button", { name: "Demander des modifications" }));

    await waitFor(() => expect(onRequestChanges).toHaveBeenCalledWith(requestId, "Précisez le calendrier."));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("keeps a cancellation single-shot and exposes terminal history without another athlete action", async () => {
    const onCancel = vi.fn(() => new Promise<void>(() => undefined));
    const accepted = {
      versionId: "30000000-0000-4000-8000-000000000012",
      requestId,
      requestStatus: "accepted" as const,
      revisionNumber: 2,
      source: "athlete_submission" as const,
      shortGoal: "Objectif validé",
      mediumGoal: null,
      longGoal: null,
      acceptedAt: "2026-08-30T11:00:00Z",
      submittedAt: "2026-08-30T10:00:00Z",
      reviewOutcome: "accepted" as const,
      reviewedAt: "2026-08-30T11:00:00Z",
      reviewNote: null,
    };
    const { rerender } = render(
      <CoachGoalsV2Panel
        state={state()}
        onOpen={vi.fn()}
        onCancel={onCancel}
        onAccept={vi.fn()}
        onRequestChanges={vi.fn()}
      />,
    );

    const cancel = screen.getByRole("button", { name: "Annuler la demande" });
    fireEvent.click(cancel);
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(cancel).toBeDisabled();

    rerender(<AthleteGoalsV2Panel state={state({ openRequest: null, current: accepted, history: [accepted] })} onSubmit={vi.fn()} />);
    expect(screen.getByText("Objectif actuellement validé")).toBeInTheDocument();
    expect(screen.getByText("Aucune demande de mise à jour n’est en attente.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Envoyer mes objectifs" })).not.toBeInTheDocument();
  });

  it("pre-fills the latest immutable version when changes are requested", () => {
    render(
      <AthleteGoalsV2Panel
        state={state({
          openRequest: {
            ...state().openRequest!,
            status: "changes_requested",
            reviewNote: "Ajouter un objectif de récupération.",
            latestVersion: {
              versionId: "30000000-0000-4000-8000-000000000013",
              requestId,
              requestStatus: "changes_requested",
              revisionNumber: 1,
              source: "athlete_submission",
              shortGoal: "Course V1",
              mediumGoal: null,
              longGoal: null,
              submittedAt: "2026-08-30T10:00:00Z",
              reviewOutcome: "changes_requested",
              reviewedAt: "2026-08-30T11:00:00Z",
              reviewNote: "Ajouter un objectif de récupération.",
            },
          },
        })}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Ajouter un objectif de récupération.")).toBeInTheDocument();
    expect(screen.getByLabelText("Court terme (~6 mois)")).toHaveValue("Course V1");
  });
});
