import "server-only";
import { LLMError, LLMErrorCode } from "../../core/llm/errors";
import type { LLMMessage, LLMProvider, LLMRequest, LLMResponse } from "../../core/llm/types";
import { validateLLMRequest } from "../../core/llm/validate";

export interface OpenAICompatibleConfig {
  readonly id: string;
  readonly name: string;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs?: number;
}

interface ChatCompletionResponse {
  readonly model?: string;
  readonly choices?: readonly {
    readonly finish_reason?: string;
    readonly message?: { readonly content?: string | null };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly error?: { readonly message?: string; readonly code?: string };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function toMessages(request: LLMRequest): LLMMessage[] {
  const messages: LLMMessage[] = [];
  if (request.system?.trim()) {
    messages.push({ role: "system", content: request.system });
  }
  messages.push(...request.messages);
  return messages;
}

function errorMessage(status: number, body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return `Provider request failed with status ${String(status)}.`;
}

function mapHttpError(status: number, message: string, provider: string): LLMError {
  if (status === 401 || status === 403) {
    return new LLMError(LLMErrorCode.AUTHENTICATION, message, {
      provider,
      retryable: false,
    });
  }

  if (status === 429) {
    return new LLMError(LLMErrorCode.RATE_LIMIT, message, {
      provider,
      retryable: true,
    });
  }

  if (status >= 500) {
    return new LLMError(LLMErrorCode.PROVIDER_ERROR, message, {
      provider,
      retryable: true,
    });
  }

  return new LLMError(LLMErrorCode.PROVIDER_ERROR, message, {
    provider,
    retryable: false,
  });
}

function parseJson(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): LLMProvider {
  const timeoutMs = config.timeoutMs ?? 45_000;

  return {
    id: config.id,
    name: config.name,
    async generate(request: LLMRequest): Promise<LLMResponse> {
      validateLLMRequest(request);

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        request.timeoutMs ?? timeoutMs,
      );

      let response: Response;
      try {
        response = await fetch(joinUrl(config.baseUrl, "/chat/completions"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: request.model ?? config.model,
            messages: toMessages(request),
            temperature: request.temperature ?? 0,
            max_tokens: request.maxTokens ?? 1024,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new LLMError(
            LLMErrorCode.TIMEOUT,
            "The language model timed out.",
            { provider: config.id, retryable: true, cause: error },
          );
        }

        throw new LLMError(
          LLMErrorCode.NETWORK,
          "The language model could not be reached.",
          { provider: config.id, retryable: true, cause: error },
        );
      } finally {
        clearTimeout(timer);
      }

      const raw = await response.text();
      const body = parseJson(raw) as ChatCompletionResponse | undefined;

      if (!response.ok) {
        throw mapHttpError(
          response.status,
          errorMessage(response.status, body),
          config.id,
        );
      }

      const content = body?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new LLMError(
          LLMErrorCode.PROVIDER_ERROR,
          "The language model returned an empty response.",
          { provider: config.id, retryable: true },
        );
      }

      return {
        content,
        provider: config.id,
        model: body?.model ?? request.model ?? config.model,
        finishReason: body?.choices?.[0]?.finish_reason,
        usage: {
          inputTokens: body?.usage?.prompt_tokens,
          outputTokens: body?.usage?.completion_tokens,
          totalTokens: body?.usage?.total_tokens,
        },
      };
    },
  };
}
