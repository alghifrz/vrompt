import { afterEach, describe, expect, it, vi } from "vitest";
import { LLMError, LLMErrorCode } from "../../core/llm/errors";
import { createOpenAICompatibleProvider } from "./openai-compatible-provider";

function provider() {
  return createOpenAICompatibleProvider({
    id: "dashscope",
    name: "DashScope",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    model: "qwen-plus",
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createOpenAICompatibleProvider", () => {
  it("posts chat completions and maps a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: "qwen-plus",
          choices: [
            {
              finish_reason: "stop",
              message: { content: "QUESTION:\nWhat are you building?" },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await provider().generate({
      system: "Stay focused.",
      messages: [{ role: "user", content: "Start the interview." }],
      temperature: 0,
    });

    expect(response.content).toContain("What are you building?");
    expect(response.provider).toBe("dashscope");
    expect(response.usage).toEqual({
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/v1/chat/completions");
    const body = JSON.parse(String(init.body)) as {
      messages: { role: string; content: string }[];
      model: string;
    };
    expect(body.model).toBe("qwen-plus");
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "Stay focused.",
    });
    expect(
      (init.headers as Record<string, string>).Authorization,
    ).toBe("Bearer sk-test");
  });

  it("maps 401 to a non-retryable auth error without leaking the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ error: { message: "Invalid API key sk-test" } }),
      }),
    );

    await expect(
      provider().generate({
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).rejects.toMatchObject({
      name: "LLMError",
      code: LLMErrorCode.AUTHENTICATION,
      retryable: false,
    });

    try {
      await provider().generate({
        messages: [{ role: "user", content: "Hello" }],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as Error).message).not.toContain("sk-test");
    }
  });

  it("maps a timeout abort to a retryable timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const error = new Error("aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      }),
    );

    await expect(
      provider().generate({
        messages: [{ role: "user", content: "Hello" }],
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({
      code: LLMErrorCode.TIMEOUT,
      retryable: true,
    });
  });
});
