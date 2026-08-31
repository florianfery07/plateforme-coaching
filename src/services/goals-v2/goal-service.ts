import { resolveAccessControlMode, type AccessControlV2Context } from "../../lib/access";

import type {
  CurrentGoal,
  GoalHistoryItem,
  GoalRequestResult,
  GoalRequestStatus,
  GoalRpcError,
  GoalRpcResponse,
  GoalState,
  GoalsV2Repository,
  GoalsV2Service,
  OpenGoalRequest,
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const requestStatuses = new Set<GoalRequestStatus>([
  "requested",
  "submitted",
  "changes_requested",
  "accepted",
  "cancelled",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isRequestStatus(value: unknown): value is GoalRequestStatus {
  return typeof value === "string" && requestStatuses.has(value as GoalRequestStatus);
}

function safeError(error: GoalRpcError | null): Error {
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403 || error?.message === "athlete_goal_permission_denied") {
    return new Error("Vous n’êtes pas autorisé à modifier ces objectifs.");
  }
  if (error?.message?.startsWith("athlete_goal_validation")) {
    return new Error("Les objectifs fournis sont invalides.");
  }
  if (error?.message?.startsWith("athlete_goal_state") || error?.message?.startsWith("athlete_goal_idempotency")) {
    return new Error("Cette demande a déjà évolué. Actualisez son état avant de recommencer.");
  }
  if (error?.message?.startsWith("athlete_goal_")) {
    return new Error("Cette demande d’objectifs n’est plus disponible.");
  }
  return new Error("La modification des objectifs a échoué.");
}

function parseRequestResult(value: unknown): GoalRequestResult {
  if (!isRecord(value) || !isUuid(value.requestId) || !isRequestStatus(value.status) || typeof value.changed !== "boolean") {
    throw new Error("La réponse Objectifs V2 est invalide.");
  }

  const result: GoalRequestResult = {
    requestId: value.requestId,
    status: value.status,
    changed: value.changed,
  };
  if (isUuid(value.versionId)) result.versionId = value.versionId;
  if (typeof value.revisionNumber === "number") result.revisionNumber = value.revisionNumber;
  return result;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseCurrent(value: unknown): CurrentGoal | null {
  if (!isRecord(value)) throw new Error("La réponse Objectifs V2 est invalide.");
  if (value.current === null) return null;
  if (!isRecord(value.current)
    || !isUuid(value.current.versionId)
    || !isUuid(value.current.requestId)
    || typeof value.current.revisionNumber !== "number"
    || (value.current.source !== "legacy_baseline" && value.current.source !== "athlete_submission")) {
    throw new Error("La réponse Objectifs V2 est invalide.");
  }
  return {
    versionId: value.current.versionId,
    requestId: value.current.requestId,
    revisionNumber: value.current.revisionNumber,
    source: value.current.source,
    shortGoal: nullableText(value.current.shortGoal),
    mediumGoal: nullableText(value.current.mediumGoal),
    longGoal: nullableText(value.current.longGoal),
    acceptedAt: nullableText(value.current.acceptedAt),
  };
}

function parseHistoryItem(value: unknown): GoalHistoryItem {
  if (!isRecord(value)
    || !isUuid(value.versionId)
    || !isUuid(value.requestId)
    || !isRequestStatus(value.requestStatus)
    || typeof value.revisionNumber !== "number"
    || typeof value.submittedAt !== "string"
    || (value.source !== "legacy_baseline" && value.source !== "athlete_submission")
    || (value.reviewOutcome !== null && value.reviewOutcome !== "accepted" && value.reviewOutcome !== "changes_requested")) {
    throw new Error("La réponse Objectifs V2 est invalide.");
  }
  return {
    versionId: value.versionId,
    requestId: value.requestId,
    requestStatus: value.requestStatus,
    revisionNumber: value.revisionNumber,
    source: value.source,
    shortGoal: nullableText(value.shortGoal),
    mediumGoal: nullableText(value.mediumGoal),
    longGoal: nullableText(value.longGoal),
    submittedAt: value.submittedAt,
    reviewOutcome: value.reviewOutcome,
    reviewedAt: nullableText(value.reviewedAt),
    reviewNote: nullableText(value.reviewNote),
  };
}

function parseOpenRequest(value: unknown): OpenGoalRequest | null {
  if (value === null) return null;
  if (!isRecord(value)
    || !isUuid(value.requestId)
    || (value.status !== "requested" && value.status !== "submitted" && value.status !== "changes_requested")
    || typeof value.requestedAt !== "string"
    || typeof value.updatedAt !== "string") {
    throw new Error("La réponse Objectifs V2 est invalide.");
  }
  return {
    requestId: value.requestId,
    status: value.status,
    requestedAt: value.requestedAt,
    updatedAt: value.updatedAt,
    reviewNote: nullableText(value.reviewNote),
    latestVersion: value.latestVersion === null ? null : parseHistoryItem(value.latestVersion),
  };
}

function parseState(value: unknown, expectedAthleteId: string): GoalState {
  if (!isRecord(value)
    || value.legacyAthleteId !== expectedAthleteId
    || !Array.isArray(value.history)) {
    throw new Error("La réponse Objectifs V2 est invalide.");
  }
  return {
    legacyAthleteId: expectedAthleteId,
    current: parseCurrent(value),
    openRequest: parseOpenRequest(value.openRequest),
    history: value.history.map(parseHistoryItem),
  };
}

function assertUuid(value: string, message: string): void {
  if (!isUuid(value)) throw new Error(message);
}

async function unwrap(response: Promise<GoalRpcResponse>): Promise<unknown> {
  const result = await response;
  if (result.error) throw safeError(result.error);
  return result.data;
}

/** The client may select the pilot only; every database RPC remains authoritative. */
export function shouldUseGoalsV2(
  context: AccessControlV2Context | null,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && resolveAccessControlMode(context, true) === "v2";
}

export function createGoalsV2Service(repository: GoalsV2Repository): GoalsV2Service {
  return {
    async open(input) {
      assertUuid(input.legacyAthleteId, "L’athlète sélectionné est invalide.");
      assertUuid(input.idempotencyKey, "La demande ne peut pas être identifiée de manière fiable.");
      return parseRequestResult(await unwrap(repository.open(input)));
    },
    async cancel(requestId) {
      assertUuid(requestId, "La demande sélectionnée est invalide.");
      return parseRequestResult(await unwrap(repository.cancel(requestId)));
    },
    async submit(input) {
      assertUuid(input.requestId, "La demande sélectionnée est invalide.");
      assertUuid(input.idempotencyKey, "La version ne peut pas être identifiée de manière fiable.");
      if (![input.shortGoal, input.mediumGoal, input.longGoal].some((goal) => Boolean(goal?.trim()))) {
        throw new Error("Renseignez au moins un objectif avant de l’envoyer.");
      }
      return parseRequestResult(await unwrap(repository.submit(input)));
    },
    async accept(requestId, reviewNote) {
      assertUuid(requestId, "La demande sélectionnée est invalide.");
      return parseRequestResult(await unwrap(repository.accept(requestId, reviewNote)));
    },
    async requestChanges(input) {
      assertUuid(input.requestId, "La demande sélectionnée est invalide.");
      if (!input.reviewNote.trim()) throw new Error("Expliquez les modifications demandées.");
      return parseRequestResult(await unwrap(repository.requestChanges(input)));
    },
    async getCurrent(legacyAthleteId) {
      assertUuid(legacyAthleteId, "L’athlète sélectionné est invalide.");
      return parseCurrent(await unwrap(repository.getCurrent(legacyAthleteId)));
    },
    async getState(legacyAthleteId) {
      assertUuid(legacyAthleteId, "L’athlète sélectionné est invalide.");
      return parseState(await unwrap(repository.getState(legacyAthleteId)), legacyAthleteId);
    },
    async listHistory(legacyAthleteId) {
      assertUuid(legacyAthleteId, "L’athlète sélectionné est invalide.");
      const value = await unwrap(repository.listHistory(legacyAthleteId));
      if (!Array.isArray(value)) throw new Error("La réponse Objectifs V2 est invalide.");
      return value.map(parseHistoryItem);
    },
  };
}
