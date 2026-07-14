import {
  accessAccountStatuses,
  type AccessControlAthletePermission,
  type AccessControlMembership,
  type AccessControlV2Context,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseMembership(value: unknown): AccessControlMembership | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, organizationId, role, status } = value;

  if (
    !isString(id) ||
    !isString(organizationId) ||
    !isString(role) ||
    !isString(status)
  ) {
    return null;
  }

  return { id, organizationId, role, status };
}

function parseAthletePermission(
  value: unknown,
): AccessControlAthletePermission | null {
  if (!isRecord(value)) {
    return null;
  }

  const { athleteMembershipId, canAccess, canManage } = value;

  if (
    !isString(athleteMembershipId) ||
    typeof canAccess !== "boolean" ||
    typeof canManage !== "boolean"
  ) {
    return null;
  }

  return { athleteMembershipId, canAccess, canManage };
}

export function parseAccessControlV2Context(
  value: unknown,
): AccessControlV2Context | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    userId,
    accountStatus,
    isPilot,
    isPlatformAdministrator,
    memberships,
    athletePermissions,
  } = value;

  if (
    !isString(userId) ||
    !accessAccountStatuses.includes(accountStatus as (typeof accessAccountStatuses)[number]) ||
    typeof isPilot !== "boolean" ||
    typeof isPlatformAdministrator !== "boolean" ||
    !Array.isArray(memberships) ||
    !Array.isArray(athletePermissions)
  ) {
    return null;
  }

  const parsedMemberships: AccessControlMembership[] = [];
  const parsedAthletePermissions: AccessControlAthletePermission[] = [];

  for (const membership of memberships) {
    const parsedMembership = parseMembership(membership);
    if (!parsedMembership) {
      return null;
    }
    parsedMemberships.push(parsedMembership);
  }

  for (const permission of athletePermissions) {
    const parsedPermission = parseAthletePermission(permission);
    if (!parsedPermission) {
      return null;
    }
    parsedAthletePermissions.push(parsedPermission);
  }

  return {
    userId,
    accountStatus: accountStatus as (typeof accessAccountStatuses)[number],
    isPilot,
    isPlatformAdministrator,
    memberships: parsedMemberships,
    athletePermissions: parsedAthletePermissions,
  };
}
