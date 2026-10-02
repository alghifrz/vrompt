import type { ConsistencyDiagnostic } from "../consistency/diagnostics";
import type { ErdView, PrdView } from "./docs";
import type { GenerationJob } from "./jobs";

export type { GenerationJob } from "./jobs";

export const GENERATION_TARGETS = [
  "agents-md",
  "cursor",
  "qoder",
  "claude-code",
] as const;

export type GenerationTarget = (typeof GENERATION_TARGETS)[number];

export interface GenerationTargetDefinition {
  readonly id: GenerationTarget;
  readonly name: string;
  readonly description: string;
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface GeneratedTarget {
  readonly target: GenerationTarget;
  readonly files: readonly GeneratedFile[];
}

export interface GenerationResult {
  readonly specId: string;
  readonly generatedAt: string;
  readonly targets: readonly GeneratedTarget[];
  readonly diagnostics: readonly ConsistencyDiagnostic[];
  readonly jobs?: readonly GenerationJob[];
  readonly jobFiles?: readonly GeneratedFile[];
  readonly docFiles?: readonly GeneratedFile[];
  readonly prd?: PrdView;
  readonly erd?: ErdView;
}

export interface GenerationRenderer {
  readonly target: GenerationTarget;
  render(spec: import("../schema/project-spec").ProjectSpec): readonly GeneratedFile[];
}
