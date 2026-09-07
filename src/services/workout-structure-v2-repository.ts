import { supabase } from "../lib/supabase";

import type {
  CalendarSnapshotInput,
  CreateStructuredLibraryInput,
  SaveWorkoutStructureInput,
  StructuredCalendarWorkoutInput,
  UpdateStructuredCalendarWorkoutInput,
  WorkoutStructureRpcResponse,
  WorkoutStructureV2Repository,
} from "./workout-structure-v2-persistence";

async function response(query: PromiseLike<{ data: unknown; error: { code?: string; message?: string; status?: number } | null }>): Promise<WorkoutStructureRpcResponse> {
  const result = await query;
  return { data: result.data, error: result.error };
}

/** RPC-only repository: direct table access is deliberately unavailable to clients. */
export const workoutStructureV2Repository: WorkoutStructureV2Repository = {
  createCalendar(input: StructuredCalendarWorkoutInput) {
    return response(supabase.rpc("create_structured_calendar_workout_v2", {
      p_legacy_athlete_id: input.athleteId, p_date: input.date, p_library_workout_id: input.libraryWorkoutId,
      p_title: input.title, p_category: input.category, p_subcategory: input.subcategory, p_description: input.description,
      p_expected_rpe_global: input.expectedRpeGlobal, p_expected_rpe_specific: input.expectedRpeSpecific,
      p_document: input.document, p_idempotency_key: input.idempotencyKey,
    }));
  },
  createLibrary(input: CreateStructuredLibraryInput) {
    return response(supabase.rpc("create_structured_workout_library_v2", {
      p_category: input.category, p_description: input.description, p_document: input.document,
      p_expected_rpe_global: input.expectedRpeGlobal, p_expected_rpe_specific: input.expectedRpeSpecific,
      p_idempotency_key: input.idempotencyKey, p_subcategory: input.subcategory, p_title: input.title,
    }));
  },
  getLibrary(libraryWorkoutId: string) {
    return response(supabase.rpc("get_workout_library_structure_v2", {
      p_library_workout_id: libraryWorkoutId,
    }));
  },
  getCalendar(calendarWorkoutId: string) {
    return response(supabase.rpc("get_calendar_workout_structure_v2", { p_calendar_workout_id: calendarWorkoutId }));
  },
  saveLibrary(input: SaveWorkoutStructureInput) {
    return response(supabase.rpc("upsert_workout_library_structure_v2", {
      p_document: input.document,
      p_expected_revision: input.expectedRevision,
      p_idempotency_key: input.idempotencyKey,
      p_library_workout_id: input.targetId,
    }));
  },
  saveCalendar(input: SaveWorkoutStructureInput) {
    return response(supabase.rpc("upsert_calendar_workout_structure_v2", {
      p_calendar_workout_id: input.targetId,
      p_document: input.document,
      p_expected_revision: input.expectedRevision,
      p_idempotency_key: input.idempotencyKey,
    }));
  },
  createCalendarSnapshot(input: CalendarSnapshotInput) {
    return response(supabase.rpc("create_calendar_workout_structure_snapshot_v2", {
      p_calendar_workout_id: input.calendarWorkoutId,
      p_idempotency_key: input.idempotencyKey,
      p_library_structure_id: input.libraryStructureId,
    }));
  },
  updateCalendar(input: UpdateStructuredCalendarWorkoutInput) {
    return response(supabase.rpc("update_structured_calendar_workout_v2", {
      p_calendar_workout_id: input.calendarWorkoutId, p_title: input.title, p_category: input.category,
      p_subcategory: input.subcategory, p_description: input.description,
      p_expected_rpe_global: input.expectedRpeGlobal, p_expected_rpe_specific: input.expectedRpeSpecific,
      p_document: input.document, p_expected_revision: input.expectedRevision, p_idempotency_key: input.idempotencyKey,
    }));
  },
};
