import type { Database } from "../types/database";
import type { WorkoutRow } from "../types/domain";

import { mapCalendarSession, type CalendarSession } from "./calendar-sessions";

type AthleteProposalRow = Database["public"]["Tables"]["athlete_proposals"]["Row"];

export type CalendarProposal = {
  id: string;
  athleteId: string | null;
  date: string | null;
  type: string | null;
  title: string | null;
  message: string | null;
  status: string;
};

export type CalendarProposalsRepository = {
  list: () => Promise<{
    data: AthleteProposalRow[] | null;
    error: unknown;
  }>;
};

type ProposalSchedulingRpcError = {
  code?: string;
  message: string;
  status?: number;
};

export type CalendarProposalSchedulingRepository = {
  schedule: (
    proposalId: string,
    signal?: AbortSignal,
  ) => Promise<{
    data: unknown;
    error: ProposalSchedulingRpcError | null;
  }>;
};

export type CalendarProposalSchedulingResult = {
  athleteId: string;
  created: boolean;
  proposalId: string;
  session: CalendarSession;
  status: "Programmée";
};

export type CalendarProposalSchedulingService = {
  schedule: (
    proposalId: string,
    signal?: AbortSignal,
  ) => Promise<CalendarProposalSchedulingResult>;
};

export type CalendarProposalsLoadResult =
  | { kind: "success"; proposals: CalendarProposal[] }
  | { kind: "error"; error: unknown };

const hiddenStatuses = new Set(["Refusée", "Programmée"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function schedulingFailure(error: ProposalSchedulingRpcError | null) {
  if (/fetch|network/i.test(error?.message ?? "")) {
    return { kind: "network", retryable: true };
  }
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403
    || error?.message === "proposal_schedule_permission_denied") {
    return { kind: "permission", retryable: false };
  }
  if (error?.message === "proposal_schedule_validation_failed") {
    return { kind: "validation", retryable: false };
  }
  if (error?.code === "23505" || error?.message === "proposal_schedule_state_conflict") {
    return { kind: "conflict", retryable: false };
  }
  if (error?.message?.startsWith("proposal_schedule_")) {
    return { kind: "validation", retryable: false };
  }
  return { kind: "unknown", retryable: false };
}

function parseSchedulingResult(value: unknown): CalendarProposalSchedulingResult | null {
  const candidate = object(value);
  const workout = object(candidate?.workout);

  if (!candidate || !workout
    || !isUuid(candidate.proposalId)
    || candidate.status !== "Programmée"
    || typeof candidate.created !== "boolean"
    || !isUuid(workout.id)
    || !isUuid(workout.athlete_id)
    || typeof workout.date !== "string"
    || workout.source_proposal_id !== candidate.proposalId) {
    return null;
  }

  return {
    athleteId: workout.athlete_id,
    created: candidate.created,
    proposalId: candidate.proposalId,
    session: mapCalendarSession({
      ...workout,
      athlete_id: workout.athlete_id,
      date: workout.date,
      id: workout.id,
      source_proposal_id: workout.source_proposal_id,
    } as WorkoutRow),
    status: "Programmée",
  };
}

/** Preserves the legacy proposal read model while keeping filtering independent from React. */
export function mapCalendarProposals(
  rows: AthleteProposalRow[] | null,
): CalendarProposal[] {
  return (rows ?? [])
    .filter((row) => !hiddenStatuses.has(row.status ?? ""))
    .map((row) => ({
      id: row.id,
      athleteId: row.athlete_id,
      date: row.date,
      type: row.type,
      title: row.title,
      message: row.message,
      status: row.status || "À traiter",
    }));
}

export function calendarProposalsForAthlete(
  proposals: CalendarProposal[],
  athleteId: string,
): CalendarProposal[] {
  return proposals.filter((proposal) => proposal.athleteId === athleteId);
}

export function calendarProposalsForDate(
  proposals: CalendarProposal[],
  date: string,
): CalendarProposal[] {
  return proposals.filter((proposal) => proposal.date === date);
}

export async function loadCalendarProposals(
  repository: CalendarProposalsRepository,
): Promise<CalendarProposalsLoadResult> {
  const { data, error } = await repository.list();

  if (error) return { kind: "error", error };

  return { kind: "success", proposals: mapCalendarProposals(data) };
}

/** Schedules one proposal through the server transaction used by the reliable-mutations pilot. */
export function createCalendarProposalSchedulingService(
  repository: CalendarProposalSchedulingRepository,
): CalendarProposalSchedulingService {
  return {
    async schedule(proposalId, signal) {
      if (!isUuid(proposalId)) {
        throw { kind: "validation", retryable: false };
      }

      const response = await repository.schedule(proposalId, signal);
      if (response.error) throw schedulingFailure(response.error);

      const result = parseSchedulingResult(response.data);
      if (!result) throw { kind: "unknown", retryable: false };

      return result;
    },
  };
}
