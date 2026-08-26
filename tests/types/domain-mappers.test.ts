import { describe, expect, it } from "vitest";

import {
  mapAccessContextV2,
  mapAthleteRowToSummary,
  mapGroupRowToSummary,
  mapWorkoutFeedbackRow,
  mapWorkoutRowToSummary,
  organizationRoles,
  type AthleteRow,
  type GroupRow,
  type WorkoutFeedbackRow,
  type WorkoutRow,
} from "../../src/types/domain";

const athleteRow: AthleteRow = {
  id: "athlete-id",
  name: "Athlete One",
  sport: null,
  weight: null,
  ftp: null,
  created_at: null,
  email: null,
  age: null,
  height: null,
  short_goal: null,
  medium_goal: null,
  long_goal: null,
  context: null,
  power5: null,
  power12: null,
  power20: null,
  user_id: null,
  active: true,
  goal_update_requested: false,
  color: null,
};

const workoutRow: WorkoutRow = {
  id: "workout-id",
  athlete_id: "athlete-id",
  date: "2026-07-14",
  workout_type: null,
  title: null,
  duration: null,
  completed: false,
  created_at: null,
  non_done: false,
  non_done_reason: null,
  non_done_fatigue: null,
  non_done_pain: null,
  non_done_comment: null,
  description: null,
  expected_rpe: null,
  blocks: null,
  subcategory: null,
  expected_rpe_global: null,
  expected_specific_duration: null,
  expected_rpe_specific: null,
  adjusted_specific_duration: null,
  athlete_seen_at: null,
  source_proposal_id: null,
};

const feedbackRow: WorkoutFeedbackRow = {
  id: "feedback-id",
  workout_id: "workout-id",
  rpe: null,
  motivation: null,
  pleasure: null,
  comment: null,
  real_duration: null,
  created_at: null,
  rpe_global: null,
  rpe_specific: null,
};

const groupRow: GroupRow = {
  id: "group-id",
  name: "Development squad",
  created_at: null,
};

describe("typed domain mappers", () => {
  it("preserves nullable athlete fields without inventing defaults", () => {
    expect(mapAthleteRowToSummary(athleteRow)).toEqual({
      id: "athlete-id",
      name: "Athlete One",
      email: null,
      sport: null,
      active: true,
      color: null,
    });
  });

  it("maps workout, feedback, and group summaries from generated row types", () => {
    expect(mapWorkoutRowToSummary(workoutRow)).toEqual({
      id: "workout-id",
      athlete_id: "athlete-id",
      date: "2026-07-14",
      title: null,
      workout_type: null,
      duration: null,
      completed: false,
      non_done: false,
      expected_rpe_global: null,
    });
    expect(mapWorkoutFeedbackRow(feedbackRow).comment).toBeNull();
    expect(mapGroupRowToSummary(groupRow)).toEqual(groupRow);
  });

  it("accepts only the complete server-derived access context", () => {
    expect(
      mapAccessContextV2({
        userId: "coach-id",
        accountStatus: "active",
        isPilot: true,
        isPlatformAdministrator: false,
        memberships: [],
        athletePermissions: [],
      }),
    ).toMatchObject({ accountStatus: "active", isPilot: true });
    expect(mapAccessContextV2({ accountStatus: "active" })).toBeNull();
  });

  it("keeps organization role vocabulary aligned with L05", () => {
    expect(organizationRoles).toEqual([
      "organization_owner",
      "organization_administrator",
      "coach",
      "assistant_coach",
      "practitioner",
      "athlete",
    ]);
  });
});
