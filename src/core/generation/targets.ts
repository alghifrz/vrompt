import {
  GENERATION_TARGETS,
  type GenerationTarget,
  type GenerationTargetDefinition,
} from "./types";

export const GENERATION_TARGET_DEFINITIONS: readonly GenerationTargetDefinition[] =
  [
    {
      id: "agents-md",
      name: "AGENTS.md",
      description: "Generate a portable AGENTS.md project brief.",
    },
    {
      id: "cursor",
      name: "Cursor",
      description: "Generate .cursor/rules configuration.",
    },
    {
      id: "qoder",
      name: "Qoder",
      description: "Generate .qoder/rules configuration.",
    },
    {
      id: "claude-code",
      name: "Claude Code",
      description: "Generate CLAUDE.md and .claude/rules files.",
    },
  ];

const TARGET_RANK = new Map(
  GENERATION_TARGETS.map((id, index) => [id, index]),
);

export function isGenerationTarget(value: string): value is GenerationTarget {
  return TARGET_RANK.has(value as GenerationTarget);
}

export function targetDefinition(
  id: GenerationTarget,
): GenerationTargetDefinition {
  const definition = GENERATION_TARGET_DEFINITIONS.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown generation target "${id}".`);
  }

  return definition;
}

export function compareGenerationTargets(
  left: GenerationTarget,
  right: GenerationTarget,
): number {
  return (TARGET_RANK.get(left) ?? 99) - (TARGET_RANK.get(right) ?? 99);
}
