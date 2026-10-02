import { ProjectSpecSchema } from "../../core/schema/project-spec";
import { toSafeReviewError } from "../../lib/review/safe-error";
import {
  parseReviewSpec,
  toReviewViewModel,
  type ReviewViewError,
  type ReviewViewModel,
} from "../../lib/review/view-model";
import type { RequireAuth } from "../auth/require-auth";
import { AuthError, PersistenceErrorCode } from "../persistence/errors";
import type { ProjectRepository } from "../repositories/types";

export type ReviewFlowResult =
  | { ok: true; view: ReviewViewModel }
  | { ok: false; error: ReviewViewError };

export function createReviewFlow(deps: {
  requireAuth: RequireAuth;
  projects: ProjectRepository;
}) {
  return {
    async load(projectId: string): Promise<ReviewFlowResult> {
      const { userId } = await deps.requireAuth();
      try {
        const project = await deps.projects.getProject({
          projectId,
          ownerId: userId,
        });
        if (!project) {
          return { ok: false, error: notFoundError() };
        }

        const parsed = parseReviewSpec(project.spec);
        if (!parsed.success) {
          return {
            ok: false,
            error: {
              code: PersistenceErrorCode.VALIDATION_FAILED,
              message:
                "This project specification is invalid and cannot be opened for review.",
              retryable: false,
              fields: parsed.fields,
            },
          };
        }

        return {
          ok: true,
          view: toReviewViewModel({
            projectId: project.id,
            spec: parsed.spec,
          }),
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }

        return { ok: false, error: toSafeReviewError(error) };
      }
    },

    async save(input: {
      projectId: string;
      spec: unknown;
    }): Promise<ReviewFlowResult> {
      const { userId } = await deps.requireAuth();
      const parsed = ProjectSpecSchema.safeParse(input.spec);
      if (!parsed.success) {
        const mapped = parseReviewSpec(input.spec);
        return {
          ok: false,
          error: {
            code: PersistenceErrorCode.VALIDATION_FAILED,
            message:
              "This specification still needs attention before it can be saved.",
            retryable: true,
            fields: mapped.success ? [] : mapped.fields,
          },
        };
      }

      const existing = await deps.projects.getProject({
        projectId: input.projectId,
        ownerId: userId,
      });
      if (!existing) {
        return { ok: false, error: notFoundError() };
      }

      const updated = await deps.projects.updateProject({
        projectId: input.projectId,
        ownerId: userId,
        spec: parsed.data,
      });

      return {
        ok: true,
        view: toReviewViewModel({
          projectId: updated.id,
          spec: updated.spec,
        }),
      };
    },
  };
}

export function isReviewAuthFailure(error: unknown): boolean {
  return error instanceof AuthError;
}

function notFoundError(): ReviewViewError {
  return {
    code: PersistenceErrorCode.NOT_FOUND,
    message: "This project is not available.",
    retryable: false,
  };
}
