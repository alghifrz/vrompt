import type { LLMProvider, LLMRequest, LLMResponse } from "./types";
import { validateLLMRequest } from "./validate";

export type MockLLMResponder =
  | LLMResponse
  | ((request: LLMRequest) => LLMResponse);

export interface MockLLMProviderOptions {
  readonly id?: string;
  readonly name?: string;
  readonly response?: MockLLMResponder;
}

const DEFAULT_RESPONSE: LLMResponse = {
  content: "mock response",
  provider: "mock",
  finishReason: "stop",
};

function snapshotRequest(request: LLMRequest): LLMRequest {
  return {
    ...request,
    messages: request.messages.map((message) => ({ ...message })),
    metadata: request.metadata ? { ...request.metadata } : undefined,
  };
}

function snapshotResponse(response: LLMResponse, provider: string): LLMResponse {
  return {
    ...response,
    provider: response.provider || provider,
    usage: response.usage ? { ...response.usage } : undefined,
  };
}

/**
 * In-memory provider for tests and local development.
 * Never touches the network or environment variables.
 */
export class MockLLMProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;

  readonly #requests: LLMRequest[] = [];
  readonly #response: MockLLMResponder;

  constructor(options: MockLLMProviderOptions = {}) {
    this.id = options.id ?? "mock";
    this.name = options.name ?? "Mock";
    this.#response = options.response ?? DEFAULT_RESPONSE;
  }

  get requests(): readonly LLMRequest[] {
    return this.#requests.map((request) => snapshotRequest(request));
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    validateLLMRequest(request);
    this.#requests.push(snapshotRequest(request));

    const resolved =
      typeof this.#response === "function"
        ? this.#response(request)
        : this.#response;

    return snapshotResponse(resolved, this.id);
  }
}
