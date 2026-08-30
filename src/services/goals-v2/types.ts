export type GoalRequestStatus =
  | "requested"
  | "submitted"
  | "changes_requested"
  | "accepted"
  | "cancelled";

export type GoalReviewOutcome = "accepted" | "changes_requested";

export type GoalRpcError = {
  code?: string;
  message?: string;
  status?: number;
};

export type GoalRpcResponse = {
  data: unknown;
  error: GoalRpcError | null;
};

export type GoalsV2Repository = {
  accept: (requestId: string, reviewNote?: string | null) => Promise<GoalRpcResponse>;
  cancel: (requestId: string) => Promise<GoalRpcResponse>;
  getCurrent: (legacyAthleteId: string) => Promise<GoalRpcResponse>;
  listHistory: (legacyAthleteId: string) => Promise<GoalRpcResponse>;
  open: (input: OpenGoalRequestInput) => Promise<GoalRpcResponse>;
  requestChanges: (input: ReviewGoalRequestInput) => Promise<GoalRpcResponse>;
  submit: (input: SubmitGoalVersionInput) => Promise<GoalRpcResponse>;
};

export type OpenGoalRequestInput = {
  idempotencyKey: string;
  legacyAthleteId: string;
};

export type SubmitGoalVersionInput = {
  idempotencyKey: string;
  longGoal?: string | null;
  mediumGoal?: string | null;
  requestId: string;
  shortGoal?: string | null;
};

export type ReviewGoalRequestInput = {
  requestId: string;
  reviewNote: string;
};

export type GoalRequestResult = {
  changed: boolean;
  requestId: string;
  status: GoalRequestStatus;
  versionId?: string;
  revisionNumber?: number;
};

export type CurrentGoal = {
  acceptedAt: string | null;
  longGoal: string | null;
  mediumGoal: string | null;
  requestId: string;
  revisionNumber: number;
  shortGoal: string | null;
  source: "legacy_baseline" | "athlete_submission";
  versionId: string;
};

export type GoalHistoryItem = {
  longGoal: string | null;
  mediumGoal: string | null;
  requestId: string;
  requestStatus: GoalRequestStatus;
  reviewNote: string | null;
  reviewOutcome: GoalReviewOutcome | null;
  reviewedAt: string | null;
  revisionNumber: number;
  shortGoal: string | null;
  source: "legacy_baseline" | "athlete_submission";
  submittedAt: string;
  versionId: string;
};

export type GoalsV2Service = {
  accept: (requestId: string, reviewNote?: string | null) => Promise<GoalRequestResult>;
  cancel: (requestId: string) => Promise<GoalRequestResult>;
  getCurrent: (legacyAthleteId: string) => Promise<CurrentGoal | null>;
  listHistory: (legacyAthleteId: string) => Promise<GoalHistoryItem[]>;
  open: (input: OpenGoalRequestInput) => Promise<GoalRequestResult>;
  requestChanges: (input: ReviewGoalRequestInput) => Promise<GoalRequestResult>;
  submit: (input: SubmitGoalVersionInput) => Promise<GoalRequestResult>;
};
