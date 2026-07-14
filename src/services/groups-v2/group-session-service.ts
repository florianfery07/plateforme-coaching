import type {
  CreateGroupSessionDto,
  DuplicateGroupSessionDto,
  GroupSessionParticipantDto,
  GroupSessionVersionedDto,
  UpdateGroupSessionDto,
} from "../../types/groups";

import { parseGroupSessionOperation } from "./mappers";
import type {
  GroupSessionPersistenceError,
  GroupSessionRepository,
  GroupSessionRepositoryResult,
  GroupSessionService,
  GroupSessionServiceErrorKind,
  GroupSessionServiceResult,
} from "./types";

function error(
  kind: GroupSessionServiceErrorKind,
  message: string,
): GroupSessionServiceResult {
  return { kind: "error", error: kind, message };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function validateVersionedInput(input: GroupSessionVersionedDto): string | null {
  if (input.groupSessionId.trim() === "") return "A group session identifier is required.";
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return "A positive expected version is required.";
  }
  return null;
}

function validateDraft(input: {
  title: string;
  blocks: unknown;
  scheduledFor?: string;
}): string | null {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 160) {
    return "The group session title must contain between 1 and 160 characters.";
  }
  if (!Array.isArray(input.blocks)) return "Group session blocks must be an array.";
  if (input.scheduledFor !== undefined && !isIsoDate(input.scheduledFor)) {
    return "The scheduled date must use the YYYY-MM-DD format.";
  }
  return null;
}

function validateCreate(input: CreateGroupSessionDto): string | null {
  if (input.organizationId.trim() === "") return "An organization identifier is required.";
  if (input.participantMembershipIds.length === 0) return "At least one participant is required.";
  if (new Set(input.participantMembershipIds).size !== input.participantMembershipIds.length) {
    return "Participants must be unique.";
  }
  if (input.participantMembershipIds.some((identifier) => identifier.trim() === "")) {
    return "Participant identifiers cannot be empty.";
  }
  return validateDraft(input);
}

function mapPersistenceError(errorValue: GroupSessionPersistenceError): GroupSessionServiceResult {
  if (errorValue.code === "42501" || errorValue.status === 401 || errorValue.status === 403) {
    return error("permission", "You do not have permission to manage this group session.");
  }
  if (errorValue.code === "23505" || errorValue.message.includes("version conflict")) {
    return error("conflict", "The group session changed before this action completed.");
  }
  if (errorValue.code === "23514" || errorValue.status === 400) {
    return error("validation", "The group session data is invalid.");
  }
  return error("unknown", "The group session action could not be completed.");
}

async function settle(
  request: Promise<GroupSessionRepositoryResult>,
): Promise<GroupSessionServiceResult> {
  const response = await request;
  if (response.error) return mapPersistenceError(response.error);
  const operation = parseGroupSessionOperation(response.data);
  return operation
    ? { kind: "success", operation }
    : error("unknown", "The group session service returned an invalid result.");
}

export function createGroupSessionService(
  repository: GroupSessionRepository,
): GroupSessionService {
  return {
    async create(input) {
      const message = validateCreate(input);
      return message ? error("validation", message) : settle(repository.create(input));
    },
    async update(input: UpdateGroupSessionDto) {
      const message = validateVersionedInput(input) ?? validateDraft(input.draft);
      return message ? error("validation", message) : settle(repository.update(input));
    },
    async addParticipant(input: GroupSessionParticipantDto) {
      const message = validateVersionedInput(input);
      if (message) return error("validation", message);
      return input.athleteMembershipId.trim() === ""
        ? error("validation", "An athlete membership identifier is required.")
        : settle(repository.addParticipant(input));
    },
    async removeParticipant(input: GroupSessionParticipantDto) {
      const message = validateVersionedInput(input);
      if (message) return error("validation", message);
      return input.athleteMembershipId.trim() === ""
        ? error("validation", "An athlete membership identifier is required.")
        : settle(repository.removeParticipant(input));
    },
    async duplicate(input: DuplicateGroupSessionDto) {
      const message = validateVersionedInput(input);
      if (message) return error("validation", message);
      return !isIsoDate(input.scheduledFor)
        ? error("validation", "The scheduled date must use the YYYY-MM-DD format.")
        : settle(repository.duplicate(input));
    },
    async cancel(input) {
      const message = validateVersionedInput(input);
      return message ? error("validation", message) : settle(repository.cancel(input));
    },
    async remove(input) {
      const message = validateVersionedInput(input);
      return message ? error("validation", message) : settle(repository.remove(input));
    },
  };
}
