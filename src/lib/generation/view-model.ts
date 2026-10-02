import type { ConsistencyDiagnostic } from "../../core/consistency/diagnostics";
import { GENERATION_TARGET_DEFINITIONS } from "../../core/generation/targets";
import type {
  GeneratedTarget,
  GenerationResult,
  GenerationTarget,
} from "../../core/generation/types";
import type { ProjectStatus } from "../../core/schema/project-spec";

export interface GenerationCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
}

export interface SafeGenerationDiagnostic {
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly path?: string;
  readonly target?: string;
}

export interface GenerationPageView {
  readonly projectId: string;
  readonly projectName: string;
  readonly status: ProjectStatus;
  readonly ready: boolean;
}

export interface GenerationResultView {
  readonly projectId: string;
  readonly projectName: string;
  readonly selectedTargets: readonly GenerationTarget[];
  readonly targets: readonly GeneratedTarget[];
  readonly diagnostics: readonly SafeGenerationDiagnostic[];
  readonly checks: readonly GenerationCheck[];
}

export interface GenerationViewError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export function toGenerationPageView(input: {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
}): GenerationPageView {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    status: input.status,
    ready: input.status === "ready",
  };
}

export function toGenerationResultView(input: {
  projectId: string;
  projectName: string;
  result: GenerationResult;
}): GenerationResultView {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    selectedTargets: input.result.targets.map((item) => item.target),
    targets: input.result.targets,
    diagnostics: input.result.diagnostics.map(toSafeDiagnostic),
    checks: buildGenerationChecks(input.result.diagnostics),
  };
}

export function exportQuery(targets: readonly GenerationTarget[]): string {
  return targets.join(",");
}

export function targetLabel(id: GenerationTarget): string {
  return (
    GENERATION_TARGET_DEFINITIONS.find((item) => item.id === id)?.name ?? id
  );
}

function toSafeDiagnostic(
  diagnostic: ConsistencyDiagnostic,
): SafeGenerationDiagnostic {
  return {
    severity: diagnostic.severity,
    message: diagnostic.message,
    path: diagnostic.path,
    target: diagnostic.target,
  };
}

function buildGenerationChecks(
  diagnostics: readonly ConsistencyDiagnostic[],
): GenerationCheck[] {
  const errors = diagnostics.filter((item) => item.severity === "error");
  return [
    { id: "spec", label: "ProjectSpec valid", passed: true },
    {
      id: "paths",
      label: "Output paths valid",
      passed: !errors.some((item) => item.code === "OUTPUT_INVALID_PATH"),
    },
    {
      id: "duplicates",
      label: "No duplicate files",
      passed: !errors.some((item) => item.code === "OUTPUT_PATH_DUPLICATE"),
    },
    {
      id: "consistency",
      label: "Cross-target consistency verified",
      passed: errors.length === 0,
    },
  ];
}
