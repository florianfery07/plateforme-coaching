import type { Database } from "../types/database";

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

export type CalendarProposalsLoadResult =
  | { kind: "success"; proposals: CalendarProposal[] }
  | { kind: "error"; error: unknown };

const hiddenStatuses = new Set(["Refusée", "Programmée"]);

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
