import type { Json } from "../database";

export type GroupSessionStatus = "scheduled" | "cancelled" | "deleted";

export type GroupSessionDraft = {
  scheduledFor: string;
  title: string;
  workoutType: string;
  subcategory: string;
  description: string;
  duration: string;
  expectedRpe: string;
  expectedRpeGlobal: number | null;
  expectedSpecificDuration: string;
  expectedRpeSpecific: number | null;
  blocks: Json;
};

export type CreateGroupSessionDto = GroupSessionDraft & {
  organizationId: string;
  participantMembershipIds: string[];
};

export type GroupSessionVersionedDto = {
  groupSessionId: string;
  expectedVersion: number;
};

export type UpdateGroupSessionDto = GroupSessionVersionedDto & {
  draft: GroupSessionDraft;
};

export type GroupSessionParticipantDto = GroupSessionVersionedDto & {
  athleteMembershipId: string;
};

export type DuplicateGroupSessionDto = GroupSessionVersionedDto & {
  scheduledFor: string;
};

export type GroupSessionOperation = {
  sessionId: string;
  status: GroupSessionStatus;
  version: number;
};

export type GroupSessionSnapshot = GroupSessionDraft & {
  id: string;
  organizationId: string;
  createdByMembershipId: string;
  sourceGroupSessionId: string | null;
  status: GroupSessionStatus;
  version: number;
  cancelledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
