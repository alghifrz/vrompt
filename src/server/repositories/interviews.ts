import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client";
import { interviewSessions, projects } from "../db/schema";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import {
  assertOwnerId,
  parseStoredInterviewSession,
} from "../persistence/serialize";
import {
  type Clock,
  type InterviewRepository,
  type InterviewSessionRecord,
  systemClock,
} from "./types";

function mapRow(
  row: typeof interviewSessions.$inferSelect,
): InterviewSessionRecord {
  const session = parseStoredInterviewSession({
    id: row.id,
    phase: row.phase,
    spec: row.spec,
    messages: row.messages,
    currentQuestion: row.currentQuestion ?? undefined,
    completed: row.completed,
    skippedPhases: row.skippedPhases,
    questionSeq: row.questionSeq,
  });

  return {
    id: row.id,
    projectId: row.projectId,
    ownerId: row.ownerId,
    session,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createInterviewRepository(
  db: Database = getDb(),
  options: { clock?: Clock } = {},
): InterviewRepository {
  const clock = options.clock ?? systemClock;

  return {
    async createInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const session = parseStoredInterviewSession(input.session);

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)))
        .limit(1);

      if (!project) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      const now = clock.now();
      try {
        const [row] = await db
          .insert(interviewSessions)
          .values({
            id: session.id,
            projectId: input.projectId,
            ownerId,
            phase: session.phase,
            spec: session.spec,
            messages: session.messages,
            currentQuestion: session.currentQuestion ?? null,
            completed: session.completed,
            skippedPhases: session.skippedPhases,
            questionSeq: session.questionSeq,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!row) {
          throw new PersistenceError(
            PersistenceErrorCode.DATABASE_ERROR,
            "Interview session could not be created.",
          );
        }

        return mapRow(row);
      } catch (error) {
        if (error instanceof PersistenceError) {
          throw error;
        }

        throw new PersistenceError(
          PersistenceErrorCode.CONFLICT,
          "Interview session could not be created.",
        );
      }
    },

    async getInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const [row] = await db
        .select()
        .from(interviewSessions)
        .where(
          and(
            eq(interviewSessions.id, input.sessionId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        )
        .limit(1);

      return row ? mapRow(row) : null;
    },

    async getInterviewSessionByProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const [row] = await db
        .select()
        .from(interviewSessions)
        .where(
          and(
            eq(interviewSessions.projectId, input.projectId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        )
        .limit(1);

      return row ? mapRow(row) : null;
    },

    async updateInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const session = parseStoredInterviewSession(input.session);
      if (session.id !== input.sessionId) {
        throw new PersistenceError(
          PersistenceErrorCode.VALIDATION_FAILED,
          "Interview session id cannot change.",
        );
      }

      const [row] = await db
        .update(interviewSessions)
        .set({
          phase: session.phase,
          spec: session.spec,
          messages: session.messages,
          currentQuestion: session.currentQuestion ?? null,
          completed: session.completed,
          skippedPhases: session.skippedPhases,
          questionSeq: session.questionSeq,
          updatedAt: clock.now(),
        })
        .where(
          and(
            eq(interviewSessions.id, input.sessionId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        )
        .returning();

      if (!row) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Interview session not found.",
        );
      }

      return mapRow(row);
    },

    async deleteInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const deleted = await db
        .delete(interviewSessions)
        .where(
          and(
            eq(interviewSessions.id, input.sessionId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        )
        .returning({ id: interviewSessions.id });

      if (deleted.length === 0) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Interview session not found.",
        );
      }
    },
  };
}
