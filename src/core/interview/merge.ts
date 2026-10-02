import {
  ProjectSpecSchema,
  type ProjectSpec,
} from "../schema/project-spec";
import { InterviewError, InterviewErrorCode } from "./errors";
import type { ProjectSpecPatch } from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function mergeById<T extends { id: string }>(
  current: readonly T[] | undefined,
  incoming: readonly T[] | undefined,
): T[] | undefined {
  if (!incoming) {
    return current ? current.map((item) => clone(item)) : undefined;
  }

  const merged = current ? current.map((item) => clone(item)) : [];
  const seen = new Set(merged.map((item) => item.id));

  for (const item of incoming) {
    const index = merged.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
      if (seen.has(item.id)) {
        continue;
      }
      merged.push(clone(item));
      seen.add(item.id);
      continue;
    }

    merged[index] = clone(item);
  }

  return merged;
}

/**
 * Deterministic merge:
 * - project fields replace only when present in the patch
 * - goals, api: replace the section when provided
 * - stack/security/constraints: shallow-merge keys; arrays replace when provided
 * - features, users, aiRules, architecture.components/externalServices,
 *   database.entities: merge by id (incoming item replaces the same id)
 * - architecture/database other keys replace when provided
 */
export function mergeProjectSpec(
  current: ProjectSpec,
  patch: ProjectSpecPatch,
): ProjectSpec {
  const next: ProjectSpec = clone(current);

  if (patch.project) {
    next.project = {
      ...next.project,
      ...clone(patch.project),
    };
  }

  if (patch.goals) {
    next.goals = clone(patch.goals);
  }

  if (patch.features) {
    next.features = mergeById(next.features, patch.features);
  }

  if (patch.users) {
    next.users = mergeById(next.users, patch.users);
  }

  if (patch.stack) {
    next.stack = {
      ...next.stack,
      ...clone(patch.stack),
    };
  }

  if (patch.architecture) {
    next.architecture = {
      ...next.architecture,
      ...clone(patch.architecture),
      components: mergeById(
        next.architecture?.components,
        patch.architecture.components,
      ),
      externalServices: mergeById(
        next.architecture?.externalServices,
        patch.architecture.externalServices,
      ),
      constraints: patch.architecture.constraints
        ? clone(patch.architecture.constraints)
        : next.architecture?.constraints,
    };
  }

  if (patch.database) {
    next.database = {
      ...next.database,
      ...clone(patch.database),
      entities: mergeById(next.database?.entities, patch.database.entities),
      relationships: patch.database.relationships
        ? clone(patch.database.relationships)
        : next.database?.relationships,
      constraints: patch.database.constraints
        ? clone(patch.database.constraints)
        : next.database?.constraints,
    };
  }

  if (patch.api) {
    next.api = clone(patch.api);
  }

  if (patch.security) {
    next.security = {
      ...next.security,
      ...clone(patch.security),
    };
  }

  if (patch.constraints) {
    next.constraints = {
      ...next.constraints,
      ...clone(patch.constraints),
    };
  }

  if (patch.aiRules) {
    next.aiRules = mergeById(next.aiRules, patch.aiRules);
  }

  return next;
}

export function commitProjectSpecPatch(
  current: ProjectSpec,
  patch: ProjectSpecPatch,
): { ok: true; spec: ProjectSpec } | { ok: false; error: InterviewError } {
  const merged = mergeProjectSpec(current, patch);
  const parsed = ProjectSpecSchema.safeParse(merged);

  if (!parsed.success) {
    return {
      ok: false,
      error: new InterviewError(
        InterviewErrorCode.SPEC_INVALID,
        "Merged ProjectSpec failed canonical validation.",
        {
          details: parsed.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          ),
        },
      ),
    };
  }

  return { ok: true, spec: parsed.data };
}
