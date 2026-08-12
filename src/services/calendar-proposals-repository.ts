import { supabase } from "../lib/supabase";

import type { CalendarProposalsRepository } from "./calendar-proposals";

export const calendarProposalsRepository: CalendarProposalsRepository = {
  async list() {
    return supabase
      .from("athlete_proposals")
      .select("id, athlete_id, date, type, title, message, status, created_at")
      .order("created_at", { ascending: false });
  },
};
