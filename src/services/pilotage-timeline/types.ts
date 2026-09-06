export type PilotageCycleColor = "blue" | "emerald" | "orange" | "violet" | "rose" | "cyan";
export type PilotageMilestoneKind = "goal" | "competition";

export type PilotageGoalSummary = {
  acceptedAt: string | null;
  longGoal: string | null;
  mediumGoal: string | null;
  shortGoal: string | null;
  versionId: string;
};

export type PilotageCycle = {
  colorKey: PilotageCycleColor;
  createdAt: string;
  endsOn: string;
  goalVersionId: string | null;
  id: string;
  intent: string | null;
  name: string;
  revision: number;
  startsOn: string;
  updatedAt: string;
};

export type PilotageMilestone = {
  createdAt: string;
  details: string | null;
  goalSummary: PilotageGoalSummary | null;
  goalVersionId: string | null;
  id: string;
  kind: PilotageMilestoneKind;
  revision: number;
  scheduledFor: string;
  title: string;
  updatedAt: string;
};

export type PilotageTimeline = {
  cycles: PilotageCycle[];
  legacyAthleteId: string;
  milestones: PilotageMilestone[];
};

export type SavePilotageCycleInput = {
  colorKey: PilotageCycleColor;
  cycleId?: string | null;
  endsOn: string;
  expectedRevision?: number | null;
  goalVersionId?: string | null;
  idempotencyKey?: string | null;
  intent?: string | null;
  legacyAthleteId: string;
  name: string;
  startsOn: string;
};

export type SavePilotageMilestoneInput = {
  details?: string | null;
  expectedRevision?: number | null;
  goalVersionId?: string | null;
  idempotencyKey?: string | null;
  kind: PilotageMilestoneKind;
  legacyAthleteId: string;
  milestoneId?: string | null;
  scheduledFor: string;
  title: string;
};

export type PilotageTimelineRepository = {
  archiveCycle: (cycleId: string) => Promise<PilotageTimelineRpcResponse>;
  archiveMilestone: (milestoneId: string) => Promise<PilotageTimelineRpcResponse>;
  get: (input: { legacyAthleteId: string; rangeEnd: string; rangeStart: string }) => Promise<PilotageTimelineRpcResponse>;
  saveCycle: (input: SavePilotageCycleInput) => Promise<PilotageTimelineRpcResponse>;
  saveMilestone: (input: SavePilotageMilestoneInput) => Promise<PilotageTimelineRpcResponse>;
};

export type PilotageTimelineRpcError = { code?: string; message?: string; status?: number };
export type PilotageTimelineRpcResponse = { data: unknown; error: PilotageTimelineRpcError | null };

export type PilotageTimelineFailure = {
  error: "conflict" | "permission" | "unavailable" | "validation" | "unknown";
  kind: "error";
  message: string;
};

export type PilotageTimelineSaveResult =
  | { changed: boolean; id: string; kind: "success"; revision: number }
  | PilotageTimelineFailure;
