import { InterviewEngine, createInitialProjectSpec, createInterviewSession } from "../../core/interview/engine";
import { applySpecLanguagePass } from "../../core/interview/rewrite";
import type { LLMProvider } from "../../core/llm/types";
import {
  toInterviewViewModel,
  type InterviewViewModel,
} from "../../lib/interview/view-model";
import { toSafeInterviewError } from "../../lib/interview/safe-error";
import type { RequireAuth } from "../auth/require-auth";
import { AuthError } from "../persistence/errors";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import type {
  IdFactory,
  InterviewRepository,
  ProjectRepository,
} from "../repositories/types";
import { cryptoIdFactory } from "../repositories/types";

export type InterviewFlowResult =
  | { ok: true; view: InterviewViewModel }
  | { ok: false; error: InterviewViewModel["error"] & {} };

export function createInterviewFlow(deps: {
  requireAuth: RequireAuth;
  projects: ProjectRepository;
  interviews: InterviewRepository;
  createProvider: () => LLMProvider;
  ids?: IdFactory;
}) {
  const ids = deps.ids ?? cryptoIdFactory;

  async function persistTurn(
    ownerId: string,
    projectId: string,
    sessionId: string,
    session: Parameters<InterviewRepository["updateInterviewSession"]>[0]["session"],
    existed: boolean,
  ): Promise<void> {
    if (existed) {
      await deps.interviews.updateInterviewSession({
        sessionId,
        ownerId,
        session,
      });
    } else {
      await deps.interviews.createInterviewSession({
        ownerId,
        projectId,
        session,
      });
    }

    try {
      // Session write first, then project spec. A shared DB transaction can
      // wrap this pair later; do not ignore a failed spec write.
      await deps.projects.updateProject({
        projectId,
        ownerId,
        spec: session.spec,
      });
    } catch {
      throw new PersistenceError(
        PersistenceErrorCode.DATABASE_ERROR,
        "Interview was saved but the project spec could not be updated.",
      );
    }
  }

  return {
    async startProject(): Promise<InterviewFlowResult> {
      const { userId } = await deps.requireAuth();
      try {
        const spec = createInitialProjectSpec();
        const project = await deps.projects.createProject({
          ownerId: userId,
          spec,
        });
        const draft = createInterviewSession({ id: ids.next() });
        const opened = await new InterviewEngine(deps.createProvider()).start(draft);
        await persistTurn(userId, project.id, opened.session.id, opened.session, false);

        return {
          ok: true,
          view: toInterviewViewModel({
            projectId: project.id,
            projectName: opened.session.spec.project.name,
            session: opened.session,
            error: opened.error ? toSafeInterviewError(opened.error) : undefined,
          }),
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }

        return { ok: false, error: toSafeInterviewError(error) };
      }
    },

    async loadInterview(projectId: string): Promise<InterviewFlowResult> {
      const { userId } = await deps.requireAuth();
      const project = await deps.projects.getProject({
        projectId,
        ownerId: userId,
      });
      if (!project) {
        return { ok: false, error: toSafeInterviewError(new PersistenceError(PersistenceErrorCode.NOT_FOUND, "Not found.")) };
      }

      const existing = await deps.interviews.getInterviewSessionByProject({
        projectId,
        ownerId: userId,
      });
      if (existing) {
        return {
          ok: true,
          view: toInterviewViewModel({
            projectId: project.id,
            projectName: existing.session.spec.project.name,
            session: existing.session,
          }),
        };
      }

      const draft = createInterviewSession({ id: ids.next() });
      const opened = await new InterviewEngine(deps.createProvider()).start(draft);
      await persistTurn(userId, project.id, opened.session.id, opened.session, false);

      return {
        ok: true,
        view: toInterviewViewModel({
          projectId: project.id,
          projectName: opened.session.spec.project.name,
          session: opened.session,
          error: opened.error ? toSafeInterviewError(opened.error) : undefined,
        }),
      };
    },

    async submitAnswer(input: {
      projectId: string;
      sessionId: string;
      answer: string;
    }): Promise<InterviewFlowResult> {
      const { userId } = await deps.requireAuth();
      if (input.answer.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ANSWER",
            message: "Write an answer before sending.",
            retryable: true,
          },
        };
      }

      const project = await deps.projects.getProject({
        projectId: input.projectId,
        ownerId: userId,
      });
      const record = await deps.interviews.getInterviewSession({
        sessionId: input.sessionId,
        ownerId: userId,
      });

      if (!project || !record || record.projectId !== input.projectId) {
        return {
          ok: false,
          error: toSafeInterviewError(
            new PersistenceError(PersistenceErrorCode.NOT_FOUND, "Not found."),
          ),
        };
      }

      const result = await new InterviewEngine(deps.createProvider()).runTurn(
        record.session,
        input.answer,
      );

      let session = result.session;
      try {
        const spec = await applySpecLanguagePass(
          session.spec,
          deps.createProvider(),
        );
        if (spec !== session.spec) {
          session = { ...session, spec };
        }
      } catch {
        // Keep the extracted draft if rewrite fails.
      }

      await persistTurn(
        userId,
        project.id,
        record.id,
        session,
        true,
      );

      return {
        ok: true,
        view: toInterviewViewModel({
          projectId: project.id,
          projectName: session.spec.project.name,
          session,
          error: result.error ? toSafeInterviewError(result.error) : undefined,
        }),
      };
    },
  };
}

export function isAuthFailure(error: unknown): boolean {
  return error instanceof AuthError;
}
