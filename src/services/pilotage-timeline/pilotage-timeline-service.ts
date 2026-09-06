import type {
  PilotageCycle,
  PilotageCycleColor,
  PilotageGoalSummary,
  PilotageMilestone,
  PilotageMilestoneKind,
  PilotageTimeline,
  PilotageTimelineFailure,
  PilotageTimelineRepository,
  PilotageTimelineRpcError,
  PilotageTimelineSaveResult,
  SavePilotageCycleInput,
  SavePilotageMilestoneInput,
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const colors = new Set<PilotageCycleColor>(["blue", "emerald", "orange", "violet", "rose", "cyan"]);
const milestoneKinds = new Set<PilotageMilestoneKind>(["goal", "competition"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function date(value: unknown): value is string {
  return typeof value === "string" && isoDatePattern.test(value);
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function failure(error: PilotageTimelineRpcError | null): PilotageTimelineFailure {
  const message = error?.message ?? "";
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403 || message.includes("permission_denied")) {
    return { kind: "error", error: "permission", message: "Vous n’êtes pas autorisé à modifier ce pilotage." };
  }
  if (message.includes("state_conflict") || message.includes("idempotency_conflict")) {
    return { kind: "error", error: "conflict", message: "Ce pilotage a évolué entre-temps. Actualisez-le avant de recommencer." };
  }
  if (message.includes("validation_failed")) {
    return { kind: "error", error: "validation", message: "Les informations de pilotage sont invalides." };
  }
  if (message.includes("target_unavailable") || message.includes("goal_unavailable")) {
    return { kind: "error", error: "unavailable", message: "Ce pilotage ou cet objectif n’est plus disponible." };
  }
  return { kind: "error", error: "unknown", message: "La mise à jour du pilotage a échoué." };
}

function goalSummary(value: unknown): PilotageGoalSummary | null {
  if (value === null) return null;
  if (!record(value) || !uuid(value.versionId)) throw new Error("La réponse Pilotage est invalide.");
  return {
    versionId: value.versionId,
    shortGoal: nullableText(value.shortGoal),
    mediumGoal: nullableText(value.mediumGoal),
    longGoal: nullableText(value.longGoal),
    acceptedAt: nullableText(value.acceptedAt),
  };
}

function cycle(value: unknown): PilotageCycle {
  if (!record(value) || !uuid(value.id) || typeof value.name !== "string" || !date(value.startsOn) || !date(value.endsOn)
    || typeof value.colorKey !== "string" || !colors.has(value.colorKey as PilotageCycleColor)
    || typeof value.revision !== "number" || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") {
    throw new Error("La réponse Pilotage est invalide.");
  }
  return {
    id: value.id,
    name: value.name,
    startsOn: value.startsOn,
    endsOn: value.endsOn,
    colorKey: value.colorKey as PilotageCycleColor,
    intent: nullableText(value.intent),
    goalVersionId: uuid(value.goalVersionId) ? value.goalVersionId : null,
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function milestone(value: unknown): PilotageMilestone {
  if (!record(value) || !uuid(value.id) || typeof value.title !== "string" || !date(value.scheduledFor)
    || typeof value.kind !== "string" || !milestoneKinds.has(value.kind as PilotageMilestoneKind)
    || typeof value.revision !== "number" || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") {
    throw new Error("La réponse Pilotage est invalide.");
  }
  return {
    id: value.id,
    kind: value.kind as PilotageMilestoneKind,
    title: value.title,
    scheduledFor: value.scheduledFor,
    details: nullableText(value.details),
    goalVersionId: uuid(value.goalVersionId) ? value.goalVersionId : null,
    goalSummary: goalSummary(value.goalSummary),
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseTimeline(value: unknown, expectedAthleteId: string): PilotageTimeline {
  if (!record(value) || value.legacyAthleteId !== expectedAthleteId || !Array.isArray(value.cycles) || !Array.isArray(value.milestones)) {
    throw new Error("La réponse Pilotage est invalide.");
  }
  return { legacyAthleteId: expectedAthleteId, cycles: value.cycles.map(cycle), milestones: value.milestones.map(milestone) };
}

function parseSave(value: unknown): PilotageTimelineSaveResult {
  if (!record(value) || !uuid(value.id) || typeof value.revision !== "number" || typeof value.changed !== "boolean") {
    throw new Error("La réponse Pilotage est invalide.");
  }
  return { kind: "success", id: value.id, revision: value.revision, changed: value.changed };
}

function assertText(value: string, maximum: number, label: string) {
  if (!value.trim() || value.trim().length > maximum) throw new Error(`${label} est invalide.`);
}

function assertCycleInput(input: SavePilotageCycleInput) {
  if (!uuid(input.legacyAthleteId) || !date(input.startsOn) || !date(input.endsOn) || input.endsOn < input.startsOn || !colors.has(input.colorKey)) {
    throw new Error("Les informations du cycle sont invalides.");
  }
  assertText(input.name, 120, "Le nom du cycle");
  if (input.intent && input.intent.trim().length > 2000) throw new Error("L’intention du cycle est trop longue.");
  if (input.goalVersionId && !uuid(input.goalVersionId)) throw new Error("L’objectif associé est invalide.");
  assertSaveIdentity(input.cycleId, input.expectedRevision, input.idempotencyKey);
}

function assertMilestoneInput(input: SavePilotageMilestoneInput) {
  if (!uuid(input.legacyAthleteId) || !date(input.scheduledFor) || !milestoneKinds.has(input.kind)) {
    throw new Error("Les informations du jalon sont invalides.");
  }
  assertText(input.title, 160, "Le titre du jalon");
  if (input.details && input.details.trim().length > 2000) throw new Error("Le détail du jalon est trop long.");
  if (input.kind === "goal" && !uuid(input.goalVersionId)) throw new Error("Sélectionnez un objectif V2 accepté.");
  if (input.goalVersionId && !uuid(input.goalVersionId)) throw new Error("L’objectif associé est invalide.");
  assertSaveIdentity(input.milestoneId, input.expectedRevision, input.idempotencyKey);
}

function assertSaveIdentity(id: string | null | undefined, revision: number | null | undefined, idempotencyKey: string | null | undefined) {
  if (id) {
    if (!uuid(id) || !Number.isInteger(revision) || (revision ?? 0) < 1 || idempotencyKey) {
      throw new Error("La mise à jour du pilotage est invalide.");
    }
    return;
  }
  if (!uuid(idempotencyKey) || revision !== null && revision !== undefined) {
    throw new Error("La création du pilotage ne peut pas être identifiée de manière fiable.");
  }
}

export function createPilotageTimelineService(repository: PilotageTimelineRepository) {
  return {
    async archiveCycle(cycleId: string): Promise<PilotageTimelineSaveResult> {
      if (!uuid(cycleId)) throw new Error("Le cycle sélectionné est invalide.");
      const response = await repository.archiveCycle(cycleId);
      return response.error ? failure(response.error) : parseSave(response.data);
    },
    async archiveMilestone(milestoneId: string): Promise<PilotageTimelineSaveResult> {
      if (!uuid(milestoneId)) throw new Error("Le jalon sélectionné est invalide.");
      const response = await repository.archiveMilestone(milestoneId);
      return response.error ? failure(response.error) : parseSave(response.data);
    },
    async get(legacyAthleteId: string, rangeStart: string, rangeEnd: string): Promise<PilotageTimeline> {
      if (!uuid(legacyAthleteId) || !date(rangeStart) || !date(rangeEnd) || rangeEnd < rangeStart) {
        throw new Error("La période de pilotage est invalide.");
      }
      const response = await repository.get({ legacyAthleteId, rangeStart, rangeEnd });
      if (response.error) throw failure(response.error);
      return parseTimeline(response.data, legacyAthleteId);
    },
    async saveCycle(input: SavePilotageCycleInput): Promise<PilotageTimelineSaveResult> {
      assertCycleInput(input);
      const response = await repository.saveCycle(input);
      return response.error ? failure(response.error) : parseSave(response.data);
    },
    async saveMilestone(input: SavePilotageMilestoneInput): Promise<PilotageTimelineSaveResult> {
      assertMilestoneInput(input);
      const response = await repository.saveMilestone(input);
      return response.error ? failure(response.error) : parseSave(response.data);
    },
  };
}
