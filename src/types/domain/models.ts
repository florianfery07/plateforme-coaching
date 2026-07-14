import type { AccessAccountStatus, AccessControlV2Context } from "../../lib/access";
import type { Database } from "../database";

type PublicTable<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName];

export type AthleteRow = PublicTable<"athletes">["Row"];
export type WorkoutRow = PublicTable<"calendar_workouts">["Row"];
export type WorkoutFeedbackRow = PublicTable<"workout_feedbacks">["Row"];
export type GroupRow = PublicTable<"athlete_groups">["Row"];

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type AthleteSummary = Pick<
  AthleteRow,
  "id" | "name" | "email" | "sport" | "active" | "color"
>;

export type CoachSummary = {
  id: string;
  displayName: string | null;
  email: string | null;
};

export type WorkoutSummary = Pick<
  WorkoutRow,
  | "id"
  | "athlete_id"
  | "date"
  | "title"
  | "workout_type"
  | "duration"
  | "completed"
  | "non_done"
  | "expected_rpe_global"
>;

export type WorkoutFeedback = Pick<
  WorkoutFeedbackRow,
  | "id"
  | "workout_id"
  | "rpe"
  | "rpe_global"
  | "rpe_specific"
  | "motivation"
  | "pleasure"
  | "comment"
  | "real_duration"
>;

export type GroupSummary = Pick<GroupRow, "id" | "name" | "created_at">;

export type AccountStatus = AccessAccountStatus;

export const organizationRoles = [
  "organization_owner",
  "organization_administrator",
  "coach",
  "assistant_coach",
  "practitioner",
  "athlete",
] as const;

/** Values are constrained by the L05 organization_memberships role check. */
export type OrganizationRole = (typeof organizationRoles)[number];

export type AccessContextV2 = AccessControlV2Context;
