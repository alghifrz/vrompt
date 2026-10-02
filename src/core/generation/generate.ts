import {
  checkConsistency,
  checkRenderedEquivalence,
} from "../consistency/engine";
import { ProjectSpecSchema, type ProjectSpec } from "../schema/project-spec";
import { GenerationError, GenerationErrorCode } from "./errors";
import {
  cloneGeneratedFiles,
  createDefaultGenerationRegistry,
  type GenerationRegistry,
} from "./registry";
import { buildErdView, buildPrdView, renderDocFiles } from "./docs";
import { buildJobPack } from "./jobs";
import {
  compareGenerationTargets,
  isGenerationTarget,
} from "./targets";
import type {
  GeneratedFile,
  GeneratedTarget,
  GenerationResult,
  GenerationTarget,
} from "./types";

export function normalizeTargets(
  targets: readonly string[],
): GenerationTarget[] {
  if (targets.length === 0) {
    throw new GenerationError(
      GenerationErrorCode.GENERATION_TARGET_INVALID,
      "Select at least one generation target.",
    );
  }

  const unique = new Set<GenerationTarget>();
  for (const target of targets) {
    if (!isGenerationTarget(target)) {
      throw new GenerationError(
        GenerationErrorCode.GENERATION_TARGET_UNSUPPORTED,
        `Unknown generation target "${target}".`,
      );
    }

    unique.add(target);
  }

  return [...unique].sort(compareGenerationTargets);
}

export function parseReadyProjectSpec(value: unknown): ProjectSpec {
  const parsed = ProjectSpecSchema.safeParse(value);
  if (!parsed.success) {
    throw new GenerationError(
      GenerationErrorCode.GENERATION_INVALID_SPEC,
      "The project specification is invalid and cannot be generated.",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  if (parsed.data.project.status !== "ready") {
    throw new GenerationError(
      GenerationErrorCode.GENERATION_NOT_READY,
      "This project is not ready for generation. Return to Review and mark the project as ready.",
    );
  }

  return parsed.data;
}

export function generateForTarget(
  spec: unknown,
  target: string,
  registry: GenerationRegistry = createDefaultGenerationRegistry(),
): GeneratedTarget {
  return generateForTargets(spec, [target], { registry }).targets[0]!;
}

export function generateForTargets(
  spec: unknown,
  targets: readonly string[],
  options: {
    registry?: GenerationRegistry;
    specId?: string;
    now?: () => Date;
  } = {},
): GenerationResult {
  const parsed = parseReadyProjectSpec(spec);
  const selected = normalizeTargets(targets);
  const registry = options.registry ?? createDefaultGenerationRegistry();

  const generated: GeneratedTarget[] = selected.map((target) => {
    const first = renderOnce(registry, target, parsed);
    const second = renderOnce(registry, target, parsed);
    const equivalence = checkRenderedEquivalence(
      { name: target, files: first },
      { name: target, files: second },
    );
    if (!equivalence.ok) {
      throw new GenerationError(
        GenerationErrorCode.GENERATION_INCONSISTENT,
        `Target "${target}" produced non-deterministic output.`,
        equivalence.diagnostics.map((item) => item.message),
      );
    }

    return { target, files: first };
  });

  const report = checkConsistency(
    parsed,
    generated.map((item) => ({ name: item.target, files: [...item.files] })),
  );

  if (!report.ok) {
    throw new GenerationError(
      GenerationErrorCode.GENERATION_INCONSISTENT,
      "Generated output failed consistency checks.",
      report.diagnostics
        .filter((item) => item.severity === "error")
        .map((item) => item.message),
    );
  }

  const pack = buildJobPack(parsed);

  return {
    specId: options.specId ?? parsed.project.name,
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    targets: generated,
    diagnostics: report.diagnostics,
    jobs: pack.jobs,
    jobFiles: pack.files,
    docFiles: renderDocFiles(parsed),
    prd: buildPrdView(parsed),
    erd: buildErdView(parsed),
  };
}

function renderOnce(
  registry: GenerationRegistry,
  target: GenerationTarget,
  spec: ProjectSpec,
): GeneratedFile[] {
  try {
    return cloneGeneratedFiles(registry.require(target).render(spec));
  } catch (error) {
    if (error instanceof GenerationError) {
      throw error;
    }

    throw new GenerationError(
      GenerationErrorCode.GENERATION_FAILED,
      `Target "${target}" failed to generate.`,
    );
  }
}
