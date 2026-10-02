import { generateForTargets } from "../../core/generation/generate";
import {
  createDefaultGenerationRegistry,
  type GenerationRegistry,
} from "../../core/generation/registry";
import { toSafeGenerationError } from "../../lib/generation/safe-error";
import {
  toGenerationPageView,
  toGenerationResultView,
  type GenerationPageView,
  type GenerationResultView,
  type GenerationViewError,
} from "../../lib/generation/view-model";
import { createGenerationZip, zipDownloadName } from "../export/zip";
import type { RequireAuth } from "../auth/require-auth";
import { AuthError, PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import type { ProjectRepository } from "../repositories/types";

export type GenerationLoadResult =
  | { ok: true; view: GenerationPageView }
  | { ok: false; error: GenerationViewError };

export type GenerationRunResult =
  | { ok: true; view: GenerationResultView }
  | { ok: false; error: GenerationViewError };

export function createGenerationFlow(deps: {
  requireAuth: RequireAuth;
  projects: ProjectRepository;
  registry?: GenerationRegistry;
  now?: () => Date;
}) {
  const registry = deps.registry ?? createDefaultGenerationRegistry();

  async function loadOwned(projectId: string) {
    const { userId } = await deps.requireAuth();
    const project = await deps.projects.getProject({
      projectId,
      ownerId: userId,
    });
    if (!project) {
      return null;
    }

    return project;
  }

  return {
    async load(projectId: string): Promise<GenerationLoadResult> {
      try {
        const project = await loadOwned(projectId);
        if (!project) {
          return { ok: false, error: notFoundError() };
        }

        return {
          ok: true,
          view: toGenerationPageView({
            projectId: project.id,
            projectName: project.spec.project.name,
            status: project.spec.project.status,
            spec: project.spec,
          }),
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }

        return { ok: false, error: toSafeGenerationError(error) };
      }
    },

    async generate(input: {
      projectId: string;
      targets: readonly string[];
    }): Promise<GenerationRunResult> {
      try {
        const project = await loadOwned(input.projectId);
        if (!project) {
          return { ok: false, error: notFoundError() };
        }

        const result = generateForTargets(project.spec, input.targets, {
          registry,
          specId: project.id,
          now: deps.now,
        });

        return {
          ok: true,
          view: toGenerationResultView({
            projectId: project.id,
            projectName: project.spec.project.name,
            result,
          }),
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }

        return { ok: false, error: toSafeGenerationError(error) };
      }
    },

    async exportZip(input: {
      projectId: string;
      targets: readonly string[];
    }): Promise<{ filename: string; bytes: Uint8Array }> {
      const project = await loadOwned(input.projectId);
      if (!project) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      const result = generateForTargets(project.spec, input.targets, {
        registry,
        specId: project.id,
        now: deps.now,
      });

      return {
        filename: zipDownloadName(project.spec.project.name),
        bytes: await createGenerationZip(result),
      };
    },
  };
}

export function isGenerationAuthFailure(error: unknown): boolean {
  return error instanceof AuthError;
}

function notFoundError(): GenerationViewError {
  return {
    code: "NOT_FOUND",
    message: "This project is not available.",
    retryable: false,
  };
}
