import { describe, expect, it } from "vitest";
import { createInterviewLLMProvider } from "./create-provider";
import { resolveLlmConfig } from "./resolve-config";

describe("resolveLlmConfig", () => {
  it("prefers an explicit OpenAI-compatible key", () => {
    expect(
      resolveLlmConfig({
        LLM_API_KEY: "sk-test",
        LLM_BASE_URL: "https://example.test/v1",
        LLM_MODEL: "demo",
        DASHSCOPE_API_KEY: "sk-dashscope",
      }),
    ).toEqual({
      id: "openai-compatible",
      name: "OpenAI-compatible",
      apiKey: "sk-test",
      baseUrl: "https://example.test/v1",
      model: "demo",
    });
  });

  it("uses DashScope defaults when only DASHSCOPE_API_KEY is set", () => {
    expect(resolveLlmConfig({ DASHSCOPE_API_KEY: " sk-dash " })).toEqual({
      id: "dashscope",
      name: "DashScope",
      apiKey: "sk-dash",
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
    });
  });

  it("uses OpenAI defaults when only OPENAI_API_KEY is set", () => {
    expect(resolveLlmConfig({ OPENAI_API_KEY: "sk-openai" })).toMatchObject({
      id: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    });
  });

  it("returns undefined without credentials", () => {
    expect(resolveLlmConfig({})).toBeUndefined();
  });
});

describe("createInterviewLLMProvider", () => {
  it("uses the development mock without credentials outside production", () => {
    const provider = createInterviewLLMProvider({ NODE_ENV: "test" });
    expect(provider.id).toBe("dev-mock");
  });

  it("uses DashScope when a key is present", () => {
    const provider = createInterviewLLMProvider({
      DASHSCOPE_API_KEY: "sk-dash",
    });
    expect(provider.id).toBe("dashscope");
  });

  it("fails clearly in production without a key", () => {
    expect(() =>
      createInterviewLLMProvider({ NODE_ENV: "production" }),
    ).toThrow(/LLM API key is required in production/);
  });
});
