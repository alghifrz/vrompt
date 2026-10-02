export interface ResolvedLlmConfig {
  readonly id: string;
  readonly name: string;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

const DASHSCOPE_INTL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const OPENAI_DEFAULT = "https://api.openai.com/v1";

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

/**
 * Resolve interviewer credentials from env.
 * Core never reads this. Missing keys return undefined so local/test
 * can keep the development mock.
 */
export function resolveLlmConfig(
  env: Record<string, string | undefined> = process.env,
): ResolvedLlmConfig | undefined {
  const explicitKey = trim(env.LLM_API_KEY);
  if (explicitKey) {
    return {
      id: "openai-compatible",
      name: "OpenAI-compatible",
      apiKey: explicitKey,
      baseUrl: trim(env.LLM_BASE_URL) ?? OPENAI_DEFAULT,
      model: trim(env.LLM_MODEL) ?? "gpt-4o-mini",
    };
  }

  const dashscopeKey = trim(env.DASHSCOPE_API_KEY);
  if (dashscopeKey) {
    return {
      id: "dashscope",
      name: "DashScope",
      apiKey: dashscopeKey,
      baseUrl: trim(env.LLM_BASE_URL) ?? DASHSCOPE_INTL,
      model: trim(env.LLM_MODEL) ?? "qwen-plus",
    };
  }

  const openaiKey = trim(env.OPENAI_API_KEY);
  if (openaiKey) {
    return {
      id: "openai",
      name: "OpenAI",
      apiKey: openaiKey,
      baseUrl: trim(env.LLM_BASE_URL) ?? OPENAI_DEFAULT,
      model: trim(env.LLM_MODEL) ?? "gpt-4o-mini",
    };
  }

  return undefined;
}
