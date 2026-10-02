import type { ConsistencyDiagnostic } from "../consistency/diagnostics";

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
}

export interface GenerationRenderer {
  readonly target: GenerationTarget;
  render(spec: import("../schema/project-spec").ProjectSpec): readonly GeneratedFile[];
}
