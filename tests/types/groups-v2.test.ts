import { describe, expect, it } from "vitest";

import {
  mapGroupSessionRowToSnapshot,
  parseGroupSessionOperation,
} from "../../src/services/groups-v2";
import type { Database } from "../../src/types/database";

type GroupSessionRow = Database["public"]["Tables"]["group_sessions_v2"]["Row"];

const row: GroupSessionRow = {
  id: "session-1",
  organization_id: "organization-1",
  created_by_membership_id: "coach-membership-1",
  source_group_session_id: null,
  scheduled_for: "2026-08-01",
  status: "scheduled",
  title: "Endurance collective",
  workout_type: "Endurance",
  subcategory: "",
  description: "",
  duration: "1h30",
  expected_rpe: "",
  expected_rpe_global: null,
  expected_specific_duration: "",
  expected_rpe_specific: null,
  blocks: [],
  version: 1,
  cancelled_at: null,
  deleted_at: null,
  created_at: "2026-07-14T00:00:00.000Z",
  updated_at: "2026-07-14T00:00:00.000Z",
};

describe("group session V2 types and mappers", () => {
  it("maps a generated database row into an explicit domain snapshot", () => {
    expect(mapGroupSessionRowToSnapshot(row)).toMatchObject({
      id: "session-1",
      organizationId: "organization-1",
      scheduledFor: "2026-08-01",
      status: "scheduled",
    });
  });

  it("fails closed when a transactional RPC response is malformed", () => {
    expect(parseGroupSessionOperation({ sessionId: "session-1", status: "unknown", version: 1 })).toBeNull();
    expect(parseGroupSessionOperation({ sessionId: "", status: "scheduled", version: 1 })).toBeNull();
    expect(parseGroupSessionOperation({ sessionId: "session-1", status: "scheduled", version: 1 })).toEqual({
      sessionId: "session-1",
      status: "scheduled",
      version: 1,
    });
  });
});
