import type { Json } from "../../types/database";
import type {
  CreateGroupSessionDto,
  DuplicateGroupSessionDto,
  GroupSessionParticipantDto,
  GroupSessionOperation,
  GroupSessionVersionedDto,
  UpdateGroupSessionDto,
} from "../../types/groups";

export type GroupSessionPersistenceError = {
  code?: string | null;
  message: string;
  status?: number | null;
};

export type GroupSessionRepositoryResult = {
  data: Json | null;
  error: GroupSessionPersistenceError | null;
};

export type GroupSessionRepository = {
  create: (input: CreateGroupSessionDto) => Promise<GroupSessionRepositoryResult>;
  update: (input: UpdateGroupSessionDto) => Promise<GroupSessionRepositoryResult>;
  addParticipant: (
    input: GroupSessionParticipantDto,
  ) => Promise<GroupSessionRepositoryResult>;
  removeParticipant: (
    input: GroupSessionParticipantDto,
  ) => Promise<GroupSessionRepositoryResult>;
  duplicate: (
    input: DuplicateGroupSessionDto,
  ) => Promise<GroupSessionRepositoryResult>;
  cancel: (
    input: GroupSessionVersionedDto,
  ) => Promise<GroupSessionRepositoryResult>;
  remove: (
    input: GroupSessionVersionedDto,
  ) => Promise<GroupSessionRepositoryResult>;
};

export type GroupSessionServiceErrorKind =
  | "conflict"
  | "permission"
  | "unknown"
  | "validation";

export type GroupSessionServiceResult =
  | { kind: "success"; operation: GroupSessionOperation }
  | { kind: "error"; error: GroupSessionServiceErrorKind; message: string };

export type GroupSessionService = {
  create: (input: CreateGroupSessionDto) => Promise<GroupSessionServiceResult>;
  update: (input: UpdateGroupSessionDto) => Promise<GroupSessionServiceResult>;
  addParticipant: (
    input: GroupSessionParticipantDto,
  ) => Promise<GroupSessionServiceResult>;
  removeParticipant: (
    input: GroupSessionParticipantDto,
  ) => Promise<GroupSessionServiceResult>;
  duplicate: (
    input: DuplicateGroupSessionDto,
  ) => Promise<GroupSessionServiceResult>;
  cancel: (
    input: GroupSessionVersionedDto,
  ) => Promise<GroupSessionServiceResult>;
  remove: (
    input: GroupSessionVersionedDto,
  ) => Promise<GroupSessionServiceResult>;
};
