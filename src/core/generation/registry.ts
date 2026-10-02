import { renderAgentsMd } from "../../renderers/agents-md/renderer";
import { renderClaudeCode } from "../../renderers/claude-code/renderer";
import { renderCursor } from "../../renderers/cursor/renderer";
import { renderQoder } from "../../renderers/qoder/renderer";
import { GenerationError, GenerationErrorCode } from "./errors";
import { isGenerationTarget } from "./targets";
import type {
  GeneratedFile,
  GenerationRenderer,
  GenerationTarget,
} from "./types";

export class GenerationRegistry {
  readonly #renderers = new Map<GenerationTarget, GenerationRenderer>();

  register(renderer: GenerationRenderer): void {
    if (this.#renderers.has(renderer.target)) {
      throw new GenerationError(
        GenerationErrorCode.GENERATION_FAILED,
        `Target "${renderer.target}" is already registered.`,
      );
    }

    this.#renderers.set(renderer.target, renderer);
  }

  get(target: string): GenerationRenderer | undefined {
    if (!isGenerationTarget(target)) {
      return undefined;
    }

    return this.#renderers.get(target);
  }

  require(target: string): GenerationRenderer {
    if (!isGenerationTarget(target)) {
      throw new GenerationError(
        GenerationErrorCode.GENERATION_TARGET_UNSUPPORTED,
        `Unknown generation target "${target}".`,
      );
    }

    const renderer = this.#renderers.get(target);
    if (!renderer) {
      throw new GenerationError(
        GenerationErrorCode.GENERATION_TARGET_UNSUPPORTED,
        `Unknown generation target "${target}".`,
      );
    }

    return renderer;
  }

  has(target: string): boolean {
    return this.get(target) !== undefined;
  }

  ids(): readonly GenerationTarget[] {
    return [...this.#renderers.keys()];
  }
}

export function createDefaultGenerationRegistry(): GenerationRegistry {
  const registry = new GenerationRegistry();
  registry.register({
    target: "agents-md",
    render: (spec) => [{ path: "AGENTS.md", content: renderAgentsMd(spec) }],
  });
  registry.register({
    target: "cursor",
    render: (spec) => renderCursor(spec).files,
  });
  registry.register({
    target: "qoder",
    render: (spec) => renderQoder(spec).files,
  });
  registry.register({
    target: "claude-code",
    render: (spec) => renderClaudeCode(spec).files,
  });
  return registry;
}

export function cloneGeneratedFiles(
  files: readonly GeneratedFile[],
): GeneratedFile[] {
  return files.map((file) => ({ path: file.path, content: file.content }));
}
