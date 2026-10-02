import { LLMError, LLMErrorCode } from "./errors";
import type { LLMProvider } from "./types";

/**
 * Explicit in-memory registry.
 * Callers register adapters; the registry never constructs SDK clients
 * or reads credentials from the environment.
 */
export class LLMProviderRegistry {
  readonly #providers = new Map<string, LLMProvider>();

  register(provider: LLMProvider): void {
    if (this.#providers.has(provider.id)) {
      throw new LLMError(
        LLMErrorCode.INVALID_REQUEST,
        `Provider "${provider.id}" is already registered.`,
        { retryable: false },
      );
    }

    this.#providers.set(provider.id, provider);
  }

  get(id: string): LLMProvider | undefined {
    return this.#providers.get(id);
  }

  require(id: string): LLMProvider {
    const provider = this.#providers.get(id);
    if (!provider) {
      throw new LLMError(
        LLMErrorCode.INVALID_REQUEST,
        `Unknown LLM provider "${id}".`,
        { retryable: false },
      );
    }

    return provider;
  }

  has(id: string): boolean {
    return this.#providers.has(id);
  }

  ids(): readonly string[] {
    return [...this.#providers.keys()];
  }
}
