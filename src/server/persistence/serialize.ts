import { z } from "zod";
import { createInterviewSession } from "../../core/interview/engine";
import {
  INTERVIEW_PHASES,
  type InterviewSession,
} from "../../core/interview/types";
import {
  ProjectSpecSchema,
  type ProjectSpec,
  type ProjectStatus,
} from "../../core/schema/project-spec";
import { PersistenceError, PersistenceErrorCode } from "./errors";

const interviewMessageSchema = z.object({
  role: z.enum(["system", "assistant", "user"]),
  content: z.string(),
});

const interviewQuestionSchema = z.object({
  id: z.string().trim().min(1),
  phase: z.enum(INTERVIEW_PHASES),
  text: z.string().trim().min(1),
  required: z.boolean(),
});

export const PersistedInterviewSessionSchema = z.object({
  id: z.string().trim().min(1),
  phase: z.enum(INTERVIEW_PHASES),
  spec: ProjectSpecSchema,
  messages: z.array(interviewMessageSchema),
  currentQuestion: interviewQuestionSchema.optional(),
  completed: z.boolean(),
  skippedPhases: z.array(z.enum(INTERVIEW_PHASES)),
  questionSeq: z.number().int().min(0),
});

export function parseStoredProjectSpec(value: unknown): ProjectSpec {
  const parsed = ProjectSpecSchema.safeParse(value);
  if (!parsed.success) {
    throw new PersistenceError(
      PersistenceErrorCode.VALIDATION_FAILED,
      "Stored ProjectSpec failed canonical validation.",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  return parsed.data;
}

export function parseStoredInterviewSession(value: unknown): InterviewSession {
  const parsed = PersistedInterviewSessionSchema.safeParse(value);
  if (!parsed.success) {
    throw new PersistenceError(
      PersistenceErrorCode.VALIDATION_FAILED,
      "Stored interview session is malformed.",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  return {
    id: parsed.data.id,
    phase: parsed.data.phase,
    spec: parsed.data.spec,
    messages: parsed.data.messages,
    currentQuestion: parsed.data.currentQuestion,
    completed: parsed.data.completed,
    skippedPhases: parsed.data.skippedPhases,
    questionSeq: parsed.data.questionSeq,
  };
}

export function serializeInterviewSession(
  session: InterviewSession,
): InterviewSession {
  return parseStoredInterviewSession(session);
}

export function projectStatusFromSpec(spec: ProjectSpec): ProjectStatus {
  return spec.project.status;
}

export function assertOwnerId(ownerId: string): string {
  const trimmed = ownerId.trim();
  if (!trimmed) {
    throw new PersistenceError(
      PersistenceErrorCode.UNAUTHORIZED,
      "An authenticated owner is required.",
    );
  }

  return trimmed;
}

export function createEmptyInterviewSession(id: string): InterviewSession {
  return createInterviewSession({ id });
}
