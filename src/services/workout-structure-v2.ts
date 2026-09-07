import { ZONES } from "../lib/platformDefaults";

export const WORKOUT_STRUCTURE_V2_SCHEMA_VERSION = 1 as const;
export const WORKOUT_STRUCTURE_V2_MAX_BLOCKS = 100;
export const WORKOUT_STRUCTURE_V2_MAX_REPEAT_STEPS = 20;
export const WORKOUT_STRUCTURE_V2_MAX_REPETITIONS = 100;
export const WORKOUT_STRUCTURE_V2_MAX_STEP_DURATION_SECONDS = 86_400;

const atomicStepKinds = [
  "warmup",
  "effort",
  "recovery",
  "transition",
  "cooldown",
  "free",
] as const;

export type AtomicStepKindV2 = (typeof atomicStepKinds)[number];
export type WorkoutZoneV2 = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6" | "Z7";

export type IntensityTargetV2 = {
  powerPercentCp?: {
    max: number;
    min: number;
  };
  targetRpe?: number;
  zone?: WorkoutZoneV2;
};

export type AtomicStepV2 = {
  durationSeconds: number;
  id: string;
  instruction?: string;
  intensity?: IntensityTargetV2;
  isSpecific: boolean;
  kind: AtomicStepKindV2;
  label?: string;
};

export type RepeatBlockV2 = {
  id: string;
  instruction?: string;
  kind: "repeat";
  label?: string;
  repetitions: number;
  steps: AtomicStepV2[];
};

export type WorkoutBlockV2 = AtomicStepV2 | RepeatBlockV2;

/**
 * Deliberately excludes title, discipline, category, description and session RPE.
 * Those remain canonical metadata of the library or calendar owner. Array order is
 * the sole ordering source; a second mutable order field would be contradictory.
 */
export type WorkoutStructureV2 = {
  blocks: WorkoutBlockV2[];
  schemaVersion: typeof WORKOUT_STRUCTURE_V2_SCHEMA_VERSION;
};

export type DerivedWorkoutMetrics = {
  atomicStepCount: number;
  specificDurationSeconds: number;
  specificStepCount: number;
  totalDurationSeconds: number;
};

export type CompactWorkoutBlockV2 = {
  ariaLabel: string;
  detail: string;
  id: string;
  kind: AtomicStepKindV2 | "repeat";
  title: string;
};

export type WorkoutStructureValidationIssue = {
  code:
    | "invalid_block"
    | "invalid_duration"
    | "invalid_id"
    | "invalid_instruction"
    | "invalid_intensity"
    | "invalid_kind"
    | "invalid_label"
    | "invalid_repetitions"
    | "invalid_schema_version"
    | "invalid_specific_flag"
    | "invalid_structure"
    | "invalid_zone"
    | "structure_empty"
    | "unsupported_nested_repeat";
  path: string;
};

export type WorkoutStructureValidationResult =
  | { issues: []; valid: true; value: WorkoutStructureV2 }
  | { issues: WorkoutStructureValidationIssue[]; valid: false };

export class WorkoutStructureValidationError extends Error {
  readonly issues: WorkoutStructureValidationIssue[];

  constructor(issues: WorkoutStructureValidationIssue[]) {
    super("workout_structure_v2_invalid");
    this.issues = issues;
  }
}

const zoneValues = new Set<string>(ZONES);
const atomicKindValues = new Set<string>(atomicStepKinds);
const stepLabels: Record<AtomicStepKindV2, string> = {
  warmup: "Échauffement",
  effort: "Effort",
  recovery: "Récupération",
  transition: "Transition",
  cooldown: "Retour au calme",
  free: "Libre",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(
  code: WorkoutStructureValidationIssue["code"],
  path: string,
): WorkoutStructureValidationIssue {
  return { code, path };
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isNonEmptyString(value: unknown, maximum = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function isPositiveInteger(value: unknown, maximum: number): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && Number.isFinite(value)
    && value > 0
    && value <= maximum;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateIntensity(
  value: unknown,
  path: string,
  issues: WorkoutStructureValidationIssue[],
): value is IntensityTargetV2 | undefined {
  if (value === undefined) return true;
  if (!isRecord(value) || !hasOnlyKeys(value, ["zone", "powerPercentCp", "targetRpe"])) {
    issues.push(issue("invalid_intensity", path));
    return false;
  }

  if (value.zone !== undefined && (typeof value.zone !== "string" || !zoneValues.has(value.zone))) {
    issues.push(issue("invalid_zone", `${path}.zone`));
  }

  if (value.targetRpe !== undefined && (!isFiniteNumber(value.targetRpe)
    || !Number.isInteger(value.targetRpe) || value.targetRpe < 1 || value.targetRpe > 10)) {
    issues.push(issue("invalid_intensity", `${path}.targetRpe`));
  }

  if (value.powerPercentCp !== undefined) {
    const target = value.powerPercentCp;
    if (!isRecord(target)
      || !hasOnlyKeys(target, ["min", "max"])
      || !isFiniteNumber(target.min)
      || !isFiniteNumber(target.max)
      || target.min <= 0
      || target.max < target.min
      || target.max > 300) {
      issues.push(issue("invalid_intensity", `${path}.powerPercentCp`));
    }
  }

  return true;
}

function validateAtomicStep(
  value: unknown,
  path: string,
  ids: Set<string>,
  issues: WorkoutStructureValidationIssue[],
): value is AtomicStepV2 {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "id",
    "kind",
    "durationSeconds",
    "isSpecific",
    "intensity",
    "instruction",
    "label",
  ])) {
    issues.push(issue("invalid_block", path));
    return false;
  }

  if (!isNonEmptyString(value.id, 100) || ids.has(value.id)) {
    issues.push(issue("invalid_id", `${path}.id`));
  } else {
    ids.add(value.id);
  }

  if (typeof value.kind !== "string" || !atomicKindValues.has(value.kind)) {
    issues.push(issue("invalid_kind", `${path}.kind`));
  }

  if (!isPositiveInteger(value.durationSeconds, WORKOUT_STRUCTURE_V2_MAX_STEP_DURATION_SECONDS)) {
    issues.push(issue("invalid_duration", `${path}.durationSeconds`));
  }

  if (typeof value.isSpecific !== "boolean") {
    issues.push(issue("invalid_specific_flag", `${path}.isSpecific`));
  }

  if (value.label !== undefined && !isNonEmptyString(value.label)) {
    issues.push(issue("invalid_label", `${path}.label`));
  }

  if (value.instruction !== undefined && !isNonEmptyString(value.instruction, 2_000)) {
    issues.push(issue("invalid_instruction", `${path}.instruction`));
  }

  validateIntensity(value.intensity, `${path}.intensity`, issues);
  return true;
}

function validateRepeatBlock(
  value: unknown,
  path: string,
  ids: Set<string>,
  issues: WorkoutStructureValidationIssue[],
): value is RepeatBlockV2 {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "id",
    "kind",
    "repetitions",
    "steps",
    "instruction",
    "label",
  ])) {
    issues.push(issue("invalid_block", path));
    return false;
  }

  if (!isNonEmptyString(value.id, 100) || ids.has(value.id)) {
    issues.push(issue("invalid_id", `${path}.id`));
  } else {
    ids.add(value.id);
  }

  if (!isPositiveInteger(value.repetitions, WORKOUT_STRUCTURE_V2_MAX_REPETITIONS)) {
    issues.push(issue("invalid_repetitions", `${path}.repetitions`));
  }

  if (value.label !== undefined && !isNonEmptyString(value.label)) {
    issues.push(issue("invalid_label", `${path}.label`));
  }

  if (value.instruction !== undefined && !isNonEmptyString(value.instruction, 2_000)) {
    issues.push(issue("invalid_instruction", `${path}.instruction`));
  }

  if (!Array.isArray(value.steps) || value.steps.length === 0 || value.steps.length > WORKOUT_STRUCTURE_V2_MAX_REPEAT_STEPS) {
    issues.push(issue("invalid_block", `${path}.steps`));
    return false;
  }

  value.steps.forEach((step, index) => {
    if (isRecord(step) && step.kind === "repeat") {
      issues.push(issue("unsupported_nested_repeat", `${path}.steps[${index}]`));
      return;
    }
    validateAtomicStep(step, `${path}.steps[${index}]`, ids, issues);
  });
  return true;
}

/** Validates an untrusted JSON document without inferring structure from labels or text. */
export function validateWorkoutStructureV2(value: unknown): WorkoutStructureValidationResult {
  const issues: WorkoutStructureValidationIssue[] = [];
  if (!isRecord(value) || !hasOnlyKeys(value, ["schemaVersion", "blocks"])) {
    return { valid: false, issues: [issue("invalid_structure", "$")] };
  }

  if (value.schemaVersion !== WORKOUT_STRUCTURE_V2_SCHEMA_VERSION) {
    issues.push(issue("invalid_schema_version", "$.schemaVersion"));
  }

  if (!Array.isArray(value.blocks) || value.blocks.length === 0) {
    issues.push(issue("structure_empty", "$.blocks"));
  } else if (value.blocks.length > WORKOUT_STRUCTURE_V2_MAX_BLOCKS) {
    issues.push(issue("invalid_structure", "$.blocks"));
  }

  const ids = new Set<string>();
  if (Array.isArray(value.blocks)) {
    value.blocks.forEach((block, index) => {
      if (isRecord(block) && block.kind === "repeat") {
        validateRepeatBlock(block, `$.blocks[${index}]`, ids, issues);
        return;
      }
      validateAtomicStep(block, `$.blocks[${index}]`, ids, issues);
    });
  }

  return issues.length
    ? { valid: false, issues }
    : { valid: true, issues: [], value: value as WorkoutStructureV2 };
}

export function assertValidWorkoutStructureV2(value: unknown): WorkoutStructureV2 {
  const validation = validateWorkoutStructureV2(value);
  if (!validation.valid) throw new WorkoutStructureValidationError(validation.issues);
  return validation.value;
}

function atomicStepMetrics(step: AtomicStepV2): DerivedWorkoutMetrics {
  return {
    atomicStepCount: 1,
    specificDurationSeconds: step.isSpecific ? step.durationSeconds : 0,
    specificStepCount: step.isSpecific ? 1 : 0,
    totalDurationSeconds: step.durationSeconds,
  };
}

function combineMetrics(parts: DerivedWorkoutMetrics[]): DerivedWorkoutMetrics {
  return parts.reduce<DerivedWorkoutMetrics>((total, part) => ({
    atomicStepCount: total.atomicStepCount + part.atomicStepCount,
    specificDurationSeconds: total.specificDurationSeconds + part.specificDurationSeconds,
    specificStepCount: total.specificStepCount + part.specificStepCount,
    totalDurationSeconds: total.totalDurationSeconds + part.totalDurationSeconds,
  }), {
    atomicStepCount: 0,
    specificDurationSeconds: 0,
    specificStepCount: 0,
    totalDurationSeconds: 0,
  });
}

export function calculateBlockDurationSeconds(block: WorkoutBlockV2): number {
  if (block.kind !== "repeat") return block.durationSeconds;
  return block.repetitions * block.steps.reduce((total, step) => total + step.durationSeconds, 0);
}

export function calculateRepeatDurationSeconds(block: RepeatBlockV2): number {
  return calculateBlockDurationSeconds(block);
}

export function deriveWorkoutMetrics(value: unknown): DerivedWorkoutMetrics {
  const structure = assertValidWorkoutStructureV2(value);
  return combineMetrics(structure.blocks.map((block) => {
    if (block.kind !== "repeat") return atomicStepMetrics(block);
    const repeatedMetrics = combineMetrics(block.steps.map(atomicStepMetrics));
    return {
      atomicStepCount: repeatedMetrics.atomicStepCount * block.repetitions,
      specificDurationSeconds: repeatedMetrics.specificDurationSeconds * block.repetitions,
      specificStepCount: repeatedMetrics.specificStepCount * block.repetitions,
      totalDurationSeconds: repeatedMetrics.totalDurationSeconds * block.repetitions,
    };
  }));
}

export function calculateTotalDurationSeconds(value: unknown): number {
  return deriveWorkoutMetrics(value).totalDurationSeconds;
}

export function calculateSpecificDurationSeconds(value: unknown): number {
  return deriveWorkoutMetrics(value).specificDurationSeconds;
}

export function formatWorkoutDurationV2(seconds: number): string {
  if (!isPositiveInteger(seconds, Number.MAX_SAFE_INTEGER)) {
    throw new WorkoutStructureValidationError([issue("invalid_duration", "seconds")]);
  }

  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainderSeconds = seconds % 60;
  if (hours && minutes) return `${hours}h${String(minutes).padStart(2, "0")}`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}'`;
  return `${remainderSeconds}s`;
}

function compactIntensity(step: AtomicStepV2): string {
  const intensity = step.intensity;
  if (!intensity) return "";
  const parts: string[] = [];
  if (intensity.zone) parts.push(intensity.zone);
  if (intensity.powerPercentCp) {
    const { min, max } = intensity.powerPercentCp;
    parts.push(min === max ? `${min}% CP` : `${min}-${max}% CP`);
  }
  if (intensity.targetRpe) parts.push(`RPE ${intensity.targetRpe}`);
  return parts.join(" · ");
}

function compactStep(step: AtomicStepV2, repeatChild = false): string {
  const duration = formatWorkoutDurationV2(step.durationSeconds);
  const intensity = compactIntensity(step);
  if (repeatChild && step.kind === "recovery") {
    return [duration, "récup", intensity].filter(Boolean).join(" ");
  }
  return [duration, intensity].filter(Boolean).join(" ");
}

/** Produces presentational data only; React decides how to render it. */
export function getCompactWorkoutBlocksV2(value: unknown): CompactWorkoutBlockV2[] {
  const structure = assertValidWorkoutStructureV2(value);
  return structure.blocks.map((block) => {
    if (block.kind === "repeat") {
      const detail = block.steps.map((step) => compactStep(step, true)).join(" / ");
      const title = `${block.repetitions} ×`;
      return {
        ariaLabel: `${title} ${detail}`,
        detail,
        id: block.id,
        kind: "repeat",
        title,
      };
    }

    const title = block.label || stepLabels[block.kind];
    const detail = compactStep(block);
    return {
      ariaLabel: `${title} ${detail}`,
      detail,
      id: block.id,
      kind: block.kind,
      title,
    };
  });
}
