import type { InterviewSession } from "../../core/interview/types";
import type { RequireAuth } from "../auth/require-auth";
import type {
  InterviewRepository,
  InterviewSessionRecord,
} from "../repositories/types";

export function createInterviewService(
  requireAuth: RequireAuth,
  interviews: InterviewRepository,
) {
  return {
    async create(
      projectId: string,
      session: InterviewSession,
    ): Promise<InterviewSessionRecord> {
      const { userId } = await requireAuth();
      return interviews.createInterviewSession({
        ownerId: userId,
        projectId,
        session,
      });
    },

    async get(sessionId: string): Promise<InterviewSessionRecord | null> {
      const { userId } = await requireAuth();
      return interviews.getInterviewSession({ sessionId, ownerId: userId });
    },

    async update(
      sessionId: string,
      session: InterviewSession,
    ): Promise<InterviewSessionRecord> {
      const { userId } = await requireAuth();
      return interviews.updateInterviewSession({
        sessionId,
        ownerId: userId,
        session,
      });
    },

    async delete(sessionId: string): Promise<void> {
      const { userId } = await requireAuth();
      return interviews.deleteInterviewSession({ sessionId, ownerId: userId });
    },
  };
}
