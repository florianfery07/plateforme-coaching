export type AthleteInviteStatus = "active" | "consumed" | "revoked" | "expired";

export type AthleteInviteSummary = {
  id: string;
  status: AthleteInviteStatus;
  expiresAt: string;
  createdAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
};

export type AthleteInviteRepository = {
  create: (input: { legacyAthleteId: string; coachMembershipId: string }) => Promise<{ data: unknown; error: { code?: string; message: string; status?: number } | null }>;
  list: (input: { legacyAthleteId: string; coachMembershipId: string }) => Promise<{ data: unknown; error: { code?: string; message: string; status?: number } | null }>;
  revoke: (input: { inviteId: string; coachMembershipId: string }) => Promise<{ data: unknown; error: { code?: string; message: string; status?: number } | null }>;
  consume: (token: string) => Promise<{ data: unknown; error: { code?: string; message: string; status?: number } | null }>;
};

export type AthleteInviteFailure = {
  kind: "error";
  error: "conflict" | "permission" | "unavailable" | "validation" | "unknown";
  message: string;
};

export type AthleteInviteCreateResult =
  | { kind: "success"; inviteId: string; token: string; expiresAt: string }
  | AthleteInviteFailure;
export type AthleteInviteListResult =
  | { kind: "success"; invites: AthleteInviteSummary[] }
  | AthleteInviteFailure;
export type AthleteInviteConsumeResult =
  | { kind: "success"; legacyAthleteId: string; athleteMembershipId: string; organizationId: string }
  | AthleteInviteFailure;
export type AthleteInviteRevokeResult =
  | { kind: "success"; inviteId: string; status: "revoked" | "expired" }
  | AthleteInviteFailure;
