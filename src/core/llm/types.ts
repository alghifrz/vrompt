/**
 * Provider-neutral LLM port.
 *
 * Interview and ProjectSpec generation depend on this contract, not on a
 * vendor SDK. Real adapters belong in infrastructure and receive credentials
 * explicitly; core never reads environment variables or API keys.
 *
 * Responses are generic text. Mapping output onto ProjectSpec is the
 * Interview Engine's job, not this layer's.
 */
export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  readonly role: LLMRole;
  readonly content: string;
}

export interface LLMUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface LLMRequest {
  readonly messages: readonly LLMMessage[];
  readonly system?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface LLMResponse {
  readonly content: string;
  readonly provider: string;
  readonly model?: string;
  readonly usage?: LLMUsage;
  readonly finishReason?: string;
}

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
}
