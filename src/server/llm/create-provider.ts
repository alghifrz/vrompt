import "server-only";
import { LLMError, LLMErrorCode } from "../../core/llm/errors";
import type { LLMProvider } from "../../core/llm/types";
import { createDevelopmentLLMProvider } from "./development-provider";
import { createOpenAICompatibleProvider } from "./openai-compatible-provider";
import { resolveLlmConfig } from "./resolve-config";

export function createInterviewLLMProvider(
  env: Record<string, string | undefined> = process.env,
): LLMProvider {
  const config = resolveLlmConfig(env);
  if (config) {
    return createOpenAICompatibleProvider(config);
  }

  if (env.NODE_ENV === "production") {
    throw new LLMError(
      LLMErrorCode.AUTHENTICATION,
      "An LLM API key is required in production.",
      { retryable: false },
    );
  }

  return createDevelopmentLLMProvider();
}
