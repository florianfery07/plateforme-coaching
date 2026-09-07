import {
  assertValidWorkoutStructureV2,
  type WorkoutStructureV2,
} from "./workout-structure-v2";

export type WorkoutStructureRpcError = {
  code?: string;
  message?: string;
  status?: number;
};

export type WorkoutStructureRpcResponse = {
  data: unknown;
  error: WorkoutStructureRpcError | null;
};

export type WorkoutStructurePersistenceResult = {
  changed: boolean;
  revision: number;
  specificDurationSeconds: number;
  structureId: string;
  totalDurationSeconds: number;
};

export type WorkoutStructureLibraryRead = {
  document: WorkoutStructureV2;
  revision: number;
  specificDurationSeconds: number;
  structureId: string;
  totalDurationSeconds: number;
};

export type WorkoutStructureV2Repository = {
  createLibrary: (input: CreateStructuredLibraryInput) => Promise<WorkoutStructureRpcResponse>;
  getLibrary: (libraryWorkoutId: string) => Promise<WorkoutStructureRpcResponse>;
  createCalendarSnapshot: (input: CalendarSnapshotInput) => Promise<WorkoutStructureRpcResponse>;
  saveCalendar: (input: SaveWorkoutStructureInput) => Promise<WorkoutStructureRpcResponse>;
  saveLibrary: (input: SaveWorkoutStructureInput) => Promise<WorkoutStructureRpcResponse>;
};
export type CreateStructuredLibraryInput = {
  category: string; description: string; document: WorkoutStructureV2; expectedRpeGlobal: number | null; expectedRpeSpecific: number | null; idempotencyKey: string; subcategory: string; title: string;
};

export type SaveWorkoutStructureInput = {
  document: WorkoutStructureV2;
  expectedRevision: number;
  idempotencyKey: string;
  targetId: string;
};

export type CalendarSnapshotInput = {
  calendarWorkoutId: string;
  idempotencyKey: string;
  libraryStructureId: string;
};

export type WorkoutStructureV2PersistenceService = {
  createLibrary: (input: CreateStructuredLibraryInput) => Promise<WorkoutStructurePersistenceResult & { libraryWorkoutId: string }>;
  getLibrary: (libraryWorkoutId: string) => Promise<WorkoutStructureLibraryRead | null>;
  createCalendarSnapshot: (input: CalendarSnapshotInput) => Promise<WorkoutStructurePersistenceResult>;
  saveCalendar: (input: SaveWorkoutStructureInput) => Promise<WorkoutStructurePersistenceResult>;
  saveLibrary: (input: SaveWorkoutStructureInput) => Promise<WorkoutStructurePersistenceResult>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertUuid(value: string, message: string): void {
  if (!uuidPattern.test(value)) throw new Error(message);
}

function safeError(error: WorkoutStructureRpcError | null): Error {
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403 || error?.message === "workout_structure_permission_denied") {
    return new Error("Vous n’êtes pas autorisé à modifier cette séance.");
  }
  if (error?.message === "workout_structure_revision_conflict" || error?.message === "workout_structure_idempotency_conflict") {
    return new Error("Cette séance a changé. Actualisez-la avant de recommencer.");
  }
  if (error?.message?.startsWith("workout_structure_validation")) {
    return new Error("La structure de séance est invalide.");
  }
  if (error?.message?.startsWith("workout_structure_")) {
    return new Error("Cette structure de séance n’est plus disponible.");
  }
  return new Error("L’enregistrement de la séance a échoué.");
}

function parseResult(value: unknown): WorkoutStructurePersistenceResult {
  if (!isRecord(value)
    || typeof value.structureId !== "string" || !uuidPattern.test(value.structureId)
    || typeof value.revision !== "number" || !Number.isInteger(value.revision) || value.revision < 1
    || typeof value.changed !== "boolean"
    || typeof value.totalDurationSeconds !== "number" || value.totalDurationSeconds < 1
    || typeof value.specificDurationSeconds !== "number" || value.specificDurationSeconds < 0
    || value.specificDurationSeconds > value.totalDurationSeconds) {
    throw new Error("La réponse Structure de séance V2 est invalide.");
  }
  return {
    changed: value.changed,
    revision: value.revision,
    specificDurationSeconds: value.specificDurationSeconds,
    structureId: value.structureId,
    totalDurationSeconds: value.totalDurationSeconds,
  };
}
function parseCreateResult(value: unknown): WorkoutStructurePersistenceResult & { libraryWorkoutId: string } {
  const result = parseResult(value);
  if (!isRecord(value) || typeof value.libraryWorkoutId !== "string" || !uuidPattern.test(value.libraryWorkoutId)) throw new Error("La réponse Structure de séance V2 est invalide.");
  return { ...result, libraryWorkoutId: value.libraryWorkoutId };
}

function parseLibraryRead(value: unknown): WorkoutStructureLibraryRead | null {
  if (value === null) return null;
  if (!isRecord(value)
    || typeof value.structureId !== "string" || !uuidPattern.test(value.structureId)
    || typeof value.revision !== "number" || !Number.isInteger(value.revision) || value.revision < 1
    || typeof value.totalDurationSeconds !== "number" || value.totalDurationSeconds < 1
    || typeof value.specificDurationSeconds !== "number" || value.specificDurationSeconds < 0
    || value.specificDurationSeconds > value.totalDurationSeconds) {
    throw new Error("La réponse Structure de séance V2 est invalide.");
  }
  assertValidWorkoutStructureV2(value.document);
  return {
    document: value.document as WorkoutStructureV2,
    revision: value.revision,
    specificDurationSeconds: value.specificDurationSeconds,
    structureId: value.structureId,
    totalDurationSeconds: value.totalDurationSeconds,
  };
}

async function unwrap(response: Promise<WorkoutStructureRpcResponse>): Promise<WorkoutStructurePersistenceResult> {
  const result = await response;
  if (result.error) throw safeError(result.error);
  return parseResult(result.data);
}

function validateSaveInput(input: SaveWorkoutStructureInput): void {
  assertUuid(input.targetId, "La séance sélectionnée est invalide.");
  assertUuid(input.idempotencyKey, "La sauvegarde ne peut pas être identifiée de manière fiable.");
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new Error("La révision de séance est invalide.");
  }
  assertValidWorkoutStructureV2(input.document);
}

/** Client validation improves feedback only; RPC validation remains authoritative. */
export function createWorkoutStructureV2PersistenceService(
  repository: WorkoutStructureV2Repository,
): WorkoutStructureV2PersistenceService {
  return {
    async createLibrary(input) {
      assertUuid(input.idempotencyKey, "La création ne peut pas être identifiée de manière fiable.");
      if (!input.title.trim() || !input.category.trim()) throw new Error("Renseignez un titre et une discipline.");
      assertValidWorkoutStructureV2(input.document);
      const result = await repository.createLibrary(input);
      if (result.error) throw safeError(result.error);
      return parseCreateResult(result.data);
    },
    async getLibrary(libraryWorkoutId) {
      assertUuid(libraryWorkoutId, "La séance sélectionnée est invalide.");
      const result = await repository.getLibrary(libraryWorkoutId);
      if (result.error) throw safeError(result.error);
      return parseLibraryRead(result.data);
    },
    async saveLibrary(input) {
      validateSaveInput(input);
      return unwrap(repository.saveLibrary(input));
    },
    async saveCalendar(input) {
      validateSaveInput(input);
      return unwrap(repository.saveCalendar(input));
    },
    async createCalendarSnapshot(input) {
      assertUuid(input.calendarWorkoutId, "La séance calendrier sélectionnée est invalide.");
      assertUuid(input.libraryStructureId, "Le modèle sélectionné est invalide.");
      assertUuid(input.idempotencyKey, "La programmation ne peut pas être identifiée de manière fiable.");
      return unwrap(repository.createCalendarSnapshot(input));
    },
  };
}
