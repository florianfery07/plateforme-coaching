import { supabase } from "../lib/supabase";

import {
  createCalendarProposalSchedulingService,
  type CalendarProposalSchedulingRepository,
  type CalendarProposalsRepository,
} from "./calendar-proposals";

export const calendarProposalsRepository: CalendarProposalsRepository & CalendarProposalSchedulingRepository = {
  async list() {
    return supabase
      .from("athlete_proposals")
      .select("id, athlete_id, date, type, title, message, status, created_at")
      .order("created_at", { ascending: false });
  },
  async schedule(proposalId, signal) {
    const query = supabase.rpc("schedule_athlete_proposal_v2", {
      p_proposal_id: proposalId,
    });

    if (signal) query.abortSignal(signal);

    return query;
  },
};

export const calendarProposalSchedulingService = createCalendarProposalSchedulingService(
  calendarProposalsRepository,
);
