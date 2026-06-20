// @ts-nocheck

import { supabase } from "@/lib/supabase";

export async function deleteGroupWorkoutFromDay({
  referenceSession,
  groupAthleteIds = [],
  sessionsByAthlete = {},
}) {
  if (!referenceSession) {
    return { success: false, deletedCount: 0, error: "Séance introuvable." };
  }

  if (!groupAthleteIds.length) {
    return {
      success: false,
      deletedCount: 0,
      error: "Ce groupe ne contient aucun athlète.",
    };
  }

  const sessionIdsToDelete = groupAthleteIds.flatMap((athleteId) =>
    (sessionsByAthlete[athleteId] || [])
      .filter(
        (session) =>
          session.date === referenceSession.date &&
          session.title === referenceSession.title &&
          session.category === referenceSession.category &&
          session.subcategory === referenceSession.subcategory
      )
      .map((session) => session.id)
  );

  if (!sessionIdsToDelete.length) {
    return {
      success: false,
      deletedCount: 0,
      error: "Aucune séance correspondante trouvée dans ce groupe.",
    };
  }

  const { error: feedbackError } = await supabase
    .from("workout_feedbacks")
    .delete()
    .in("workout_id", sessionIdsToDelete);

  if (feedbackError) {
    return {
      success: false,
      deletedCount: 0,
      error: feedbackError.message || "Erreur suppression feedbacks groupe.",
    };
  }

  const { error } = await supabase
    .from("calendar_workouts")
    .delete()
    .in("id", sessionIdsToDelete);

  if (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error.message || "Erreur suppression séance groupe.",
    };
  }

  return {
    success: true,
    deletedCount: sessionIdsToDelete.length,
    error: null,
  };
}

export async function deleteAthleteWorkoutFromGroupDay(referenceSession) {
  if (!referenceSession?.id) {
    return { success: false, deletedCount: 0, error: "Séance introuvable." };
  }

  const { error: feedbackError } = await supabase
    .from("workout_feedbacks")
    .delete()
    .eq("workout_id", referenceSession.id);

  if (feedbackError) {
    return {
      success: false,
      deletedCount: 0,
      error: feedbackError.message || "Erreur suppression feedback séance athlète.",
    };
  }

  const { error } = await supabase
    .from("calendar_workouts")
    .delete()
    .eq("id", referenceSession.id);

  if (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error.message || "Erreur suppression séance athlète.",
    };
  }

  return { success: true, deletedCount: 1, error: null };
}

export async function deleteGroupDayWorkouts({
  date,
  groupAthleteIds = [],
  sessionsByAthlete = {},
}) {
  if (!date) {
    return { success: false, deletedCount: 0, error: "Date introuvable." };
  }

  if (!groupAthleteIds.length) {
    return {
      success: false,
      deletedCount: 0,
      error: "Ce groupe ne contient aucun athlète.",
    };
  }

  const sessionIdsToDelete = groupAthleteIds.flatMap((athleteId) =>
    (sessionsByAthlete[athleteId] || [])
      .filter((session) => session.date === date)
      .map((session) => session.id)
  );

  if (!sessionIdsToDelete.length) {
    return {
      success: false,
      deletedCount: 0,
      error: "Aucune séance à retirer pour ce groupe ce jour-là.",
    };
  }

  const { error: feedbackError } = await supabase
    .from("workout_feedbacks")
    .delete()
    .in("workout_id", sessionIdsToDelete);

  if (feedbackError) {
    return {
      success: false,
      deletedCount: 0,
      error: feedbackError.message || "Erreur suppression feedbacks groupe.",
    };
  }

  const { error } = await supabase
    .from("calendar_workouts")
    .delete()
    .in("id", sessionIdsToDelete);

  if (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error.message || "Erreur suppression séances groupe.",
    };
  }

  return {
    success: true,
    deletedCount: sessionIdsToDelete.length,
    error: null,
  };
}
