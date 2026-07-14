import type { Database } from "../../types/database";
import type { GroupSessionOperation, GroupSessionSnapshot, GroupSessionStatus } from "../../types/groups";

type GroupSessionRow = Database["public"]["Tables"]["group_sessions_v2"]["Row"];

const statuses = new Set<GroupSessionStatus>([
  "scheduled",
  "cancelled",
  "deleted",
]);

function toStatus(value: string): GroupSessionStatus | null {
  return statuses.has(value as GroupSessionStatus)
    ? (value as GroupSessionStatus)
    : null;
}

export function mapGroupSessionRowToSnapshot(
  row: GroupSessionRow,
): GroupSessionSnapshot {
  const status = toStatus(row.status);

  if (!status) {
    throw new Error("Unexpected group session status from the database");
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    createdByMembershipId: row.created_by_membership_id,
    sourceGroupSessionId: row.source_group_session_id,
    scheduledFor: row.scheduled_for,
    status,
    title: row.title,
    workoutType: row.workout_type,
    subcategory: row.subcategory,
    description: row.description,
    duration: row.duration,
    expectedRpe: row.expected_rpe,
    expectedRpeGlobal: row.expected_rpe_global,
    expectedSpecificDuration: row.expected_specific_duration,
    expectedRpeSpecific: row.expected_rpe_specific,
    blocks: row.blocks,
    version: row.version,
    cancelledAt: row.cancelled_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseGroupSessionOperation(
  value: unknown,
): GroupSessionOperation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status =
    typeof candidate.status === "string" ? toStatus(candidate.status) : null;

  if (
    typeof candidate.sessionId !== "string" ||
    candidate.sessionId.trim() === "" ||
    !status ||
    !Number.isInteger(candidate.version) ||
    (candidate.version as number) < 1
  ) {
    return null;
  }

  return {
    sessionId: candidate.sessionId,
    status,
    version: candidate.version as number,
  };
}
