import { supabase } from "../../lib/supabase";

import type { WeekNoteReadRepository, WeekNoteRepository } from "./types";

export const supabaseWeekNoteRepository: WeekNoteRepository & WeekNoteReadRepository = {
  async list() {
    return supabase
      .from("athlete_week_notes")
      .select("athlete_id, year, week, note");
  },

  async upsert(payload, signal) {
    const { data, error } = await supabase
      .from("athlete_week_notes")
      .upsert(
        {
          athlete_id: payload.athleteId,
          note: payload.note,
          updated_at: new Date().toISOString(),
          week: payload.week,
          year: payload.year,
        },
        { onConflict: "athlete_id,year,week" },
      )
      .select("athlete_id,year,week,note,updated_at")
      .abortSignal(signal ?? new AbortController().signal)
      .single();

    return {
      data: data
        ? {
            athleteId: data.athlete_id,
            note: data.note ?? "",
            updatedAt: data.updated_at,
            week: data.week,
            year: data.year,
          }
        : null,
      error,
    };
  },
};
