export const accessAccountStatuses = [
  "unverified",
  "active",
  "suspended",
  "disabled",
] as const;

export type AccessAccountStatus = (typeof accessAccountStatuses)[number];

export type AccessControlMembership = {
  id: string;
  organizationId: string;
  role: string;
  status: string;
};

export type AccessControlAthletePermission = {
  athleteMembershipId: string;
  canAccess: boolean;
  canManage: boolean;
};

export type AccessControlV2Context = {
  userId: string;
  accountStatus: AccessAccountStatus;
  isPilot: boolean;
  isPlatformAdministrator: boolean;
  memberships: AccessControlMembership[];
  athletePermissions: AccessControlAthletePermission[];
};

export type AccessControlMode = "legacy" | "v2";

export type AccessContextRpcClient = {
  rpc: (
    functionName: "get_access_context_v2",
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};
