import {
  parseWorkspaceProjectName,
  toWorkspaceProject,
  type WorkspaceProject,
} from "../../lib/workspace/projects";
import type { RequireAuth } from "../auth/require-auth";
import { AuthError, PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import type { InterviewRepository, ProjectRepository } from "../repositories/types";

export interface WorkspaceActionError {
  readonly code: string;
  readonly message: string;
}

export type RenameProjectResult =
  | { ok: true; project: WorkspaceProject }
  | { ok: false; error: WorkspaceActionError };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: WorkspaceActionError };

export function createWorkspaceFlow(deps: {
  requireAuth: RequireAuth;
  projects: ProjectRepository;
  interviews: InterviewRepository;
}) {
  return {
    async renameProject(
      projectId: string,
      name: string,
    ): Promise<RenameProjectResult> {
      const { userId } = await deps.requireAuth();
      const parsed = parseWorkspaceProjectName(name);
      if (!parsed.ok) {
        return {
          ok: false,
          error: {
            code: PersistenceErrorCode.VALIDATION_FAILED,
            message:
              parsed.reason === "too_long"
                ? "Keep the name under 80 characters."
                : "Enter a project name.",
          },
        };
      }

      try {
        const project = await deps.projects.getProject({
          projectId,
          ownerId: userId,
        });
        if (!project) {
          return {
            ok: false,
            error: {
              code: PersistenceErrorCode.NOT_FOUND,
              message: "This project is not available.",
            },
          };
        }

        const spec = {
          ...project.spec,
          project: { ...project.spec.project, name: parsed.name },
        };

        const session = await deps.interviews.getInterviewSessionByProject({
          projectId,
          ownerId: userId,
        });
        if (session) {
          await deps.interviews.updateInterviewSession({
            sessionId: session.id,
            ownerId: userId,
            session: {
              ...session.session,
              spec: {
                ...session.session.spec,
                project: { ...session.session.spec.project, name: parsed.name },
              },
            },
          });
        }

        const updated = await deps.projects.updateProject({
          projectId,
          ownerId: userId,
          spec,
        });

        return {
          ok: true,
          project: toWorkspaceProject({
            id: updated.id,
            name: updated.name,
            status: updated.status,
          }),
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }
        return {
          ok: false,
          error: toSafeWorkspaceError(error),
        };
      }
    },

    async deleteProject(projectId: string): Promise<DeleteProjectResult> {
      const { userId } = await deps.requireAuth();
      try {
        await deps.projects.deleteProject({ projectId, ownerId: userId });
        return { ok: true };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }
        return {
          ok: false,
          error: toSafeWorkspaceError(error),
        };
      }
    },
  };
}

export function isWorkspaceAuthFailure(error: unknown): boolean {
  return error instanceof AuthError;
}

export function toSafeWorkspaceError(error: unknown): WorkspaceActionError {
  if (error instanceof PersistenceError && error.code === PersistenceErrorCode.NOT_FOUND) {
    return {
      code: error.code,
      message: "This project is not available.",
    };
  }

  if (
    error instanceof PersistenceError &&
    error.code === PersistenceErrorCode.VALIDATION_FAILED
  ) {
    return {
      code: error.code,
      message: "Enter a project name.",
    };
  }

  return {
    code: "SERVER_ERROR",
    message: "Something went wrong. Try again.",
  };
}
