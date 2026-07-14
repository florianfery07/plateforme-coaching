import { createWeekNoteService } from "./week-note-service";
import { supabaseWeekNoteRepository } from "./supabase-week-note-repository";

export const weekNoteService = createWeekNoteService(supabaseWeekNoteRepository);
