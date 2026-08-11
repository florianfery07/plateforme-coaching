import type {
  AthleteInviteConsumeResult,
  AthleteInviteCreateResult,
  AthleteInviteFailure,
  AthleteInviteListResult,
  AthleteInviteRepository,
  AthleteInviteRevokeResult,
  AthleteInviteStatus,
  AthleteInviteSummary,
} from "./types";

// PostgreSQL accepts UUID values outside the RFC version/variant subset. The
// legacy baseline contains deterministic fixture identifiers in that format.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^v2i_[0-9a-f]{64}$/;
const statuses = new Set<AthleteInviteStatus>(["active", "consumed", "revoked", "expired"]);

function id(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function failure(error: { code?: string; message: string; status?: number } | null): AthleteInviteFailure {
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403 || error?.message === "invite_permission_denied") {
    return { kind: "error", error: "permission", message: "Vous n’êtes pas autorisé à gérer cette invitation." };
  }
  if (error?.code === "23505" || error?.message === "invite_already_active") {
    return { kind: "error", error: "conflict", message: "Une invitation active existe déjà pour cet athlète." };
  }
  if (error?.message?.startsWith("invite_")) {
    return { kind: "error", error: "unavailable", message: "Cette invitation est indisponible ou n’est plus valide." };
  }
  return { kind: "error", error: "unknown", message: "L’opération sur l’invitation n’a pas pu être effectuée." };
}

function unavailable(): AthleteInviteFailure {
  return { kind: "error", error: "unavailable", message: "Cette invitation est indisponible ou n’est plus valide." };
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseSummary(value: unknown): AthleteInviteSummary | null {
  const candidate = object(value);
  if (!candidate || !id(candidate.id) || !statuses.has(candidate.status as AthleteInviteStatus)
    || typeof candidate.expiresAt !== "string" || typeof candidate.createdAt !== "string"
    || (candidate.consumedAt !== null && typeof candidate.consumedAt !== "string")
    || (candidate.revokedAt !== null && typeof candidate.revokedAt !== "string")) return null;
  return candidate as unknown as AthleteInviteSummary;
}

export function createAthleteInviteService(repository: AthleteInviteRepository) {
  return {
    async create(input: { legacyAthleteId: string; coachMembershipId: string }): Promise<AthleteInviteCreateResult> {
      if (!id(input.legacyAthleteId) || !id(input.coachMembershipId)) {
        return { kind: "error", error: "validation", message: "Les identifiants de l’invitation sont invalides." };
      }
      const response = await repository.create(input);
      if (response.error) return failure(response.error);
      const data = object(response.data);
      return data && id(data.inviteId) && typeof data.token === "string" && tokenPattern.test(data.token) && typeof data.expiresAt === "string"
        ? { kind: "success", inviteId: data.inviteId, token: data.token, expiresAt: data.expiresAt }
        : unavailable();
    },
    async list(input: { legacyAthleteId: string; coachMembershipId: string }): Promise<AthleteInviteListResult> {
      if (!id(input.legacyAthleteId) || !id(input.coachMembershipId)) {
        return { kind: "error", error: "validation", message: "Les identifiants de l’invitation sont invalides." };
      }
      const response = await repository.list(input);
      if (response.error || !Array.isArray(response.data)) return response.error ? failure(response.error) : unavailable();
      const invites = response.data.map(parseSummary);
      return invites.every(Boolean) ? { kind: "success", invites: invites as AthleteInviteSummary[] } : unavailable();
    },
    async revoke(input: { inviteId: string; coachMembershipId: string }): Promise<AthleteInviteRevokeResult> {
      if (!id(input.inviteId) || !id(input.coachMembershipId)) {
        return { kind: "error", error: "validation", message: "Les identifiants de l’invitation sont invalides." };
      }
      const response = await repository.revoke(input);
      if (response.error) return failure(response.error);
      const data = object(response.data);
      return data && id(data.inviteId) && (data.status === "revoked" || data.status === "expired")
        ? { kind: "success", inviteId: data.inviteId, status: data.status }
        : unavailable();
    },
    async consume(token: string): Promise<AthleteInviteConsumeResult> {
      if (!tokenPattern.test(token)) return unavailable();
      const response = await repository.consume(token);
      if (response.error) return failure(response.error);
      const data = object(response.data);
      if (data?.kind === "error") return unavailable();
      return data && id(data.legacyAthleteId) && id(data.athleteMembershipId) && id(data.organizationId)
        ? { kind: "success", legacyAthleteId: data.legacyAthleteId, athleteMembershipId: data.athleteMembershipId, organizationId: data.organizationId }
        : unavailable();
    },
  };
}
