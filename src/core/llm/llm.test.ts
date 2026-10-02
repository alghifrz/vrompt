import { describe, expect, it } from "vitest";
import { LLMError, LLMErrorCode } from "./errors";
import { MockLLMProvider } from "./mock";
import { LLMProviderRegistry } from "./registry";
import type { LLMProvider, LLMRequest, LLMResponse } from "./types";

const usage = {
  inputTokens: 12,
  outputTokens: 4,
  totalTokens: 16,
} as const;

const staticResponse: LLMResponse = {
  content: "structured draft",
  provider: "mock",
  model: "mock-small",
  finishReason: "stop",
  usage,
};

function userRequest(content = "Describe the project."): LLMRequest {
  return {
    messages: [{ role: "user", content }],
  };
}

async function generateThroughPort(
  provider: LLMProvider,
  request: LLMRequest,
): Promise<LLMResponse> {
  return provider.generate(request);
}

describe("LLM abstraction", () => {
  describe("request types", () => {
    it("accepts a system message", async () => {
      const provider = new MockLLMProvider();
      const request: LLMRequest = {
        messages: [{ role: "system", content: "Stay concise." }],
      };

      await provider.generate(request);

      expect(provider.requests[0]?.messages).toEqual(request.messages);
    });

    it("accepts a user message", async () => {
      const provider = new MockLLMProvider();
      const request = userRequest();

      await provider.generate(request);

      expect(provider.requests[0]?.messages[0]).toEqual({
        role: "user",
        content: "Describe the project.",
      });
    });

    it("accepts an assistant message", async () => {
      const provider = new MockLLMProvider();
      const request: LLMRequest = {
        messages: [{ role: "assistant", content: "What is the product name?" }],
      };

      await provider.generate(request);

      expect(provider.requests[0]?.messages[0]?.role).toBe("assistant");
    });

    it("accepts multiple messages", async () => {
      const provider = new MockLLMProvider();
      const request: LLMRequest = {
        messages: [
          { role: "system", content: "Extract project facts." },
          { role: "user", content: "It is a field toolkit." },
          { role: "assistant", content: "Who are the users?" },
          { role: "user", content: "Dispatchers and technicians." },
        ],
      };

      await provider.generate(request);

      expect(provider.requests[0]?.messages).toHaveLength(4);
      expect(provider.requests[0]?.messages.map((message) => message.role)).toEqual(
        ["system", "user", "assistant", "user"],
      );
    });

    it("accepts an optional model", async () => {
      const provider = new MockLLMProvider();

      await provider.generate({
        ...userRequest(),
        model: "neutral-large",
      });

      expect(provider.requests[0]?.model).toBe("neutral-large");
    });

    it("accepts an optional temperature", async () => {
      const provider = new MockLLMProvider();

      await provider.generate({
        ...userRequest(),
        temperature: 0.2,
      });

      expect(provider.requests[0]?.temperature).toBe(0.2);
    });

    it("accepts an optional maxTokens", async () => {
      const provider = new MockLLMProvider();

      await provider.generate({
        ...userRequest(),
        maxTokens: 256,
      });

      expect(provider.requests[0]?.maxTokens).toBe(256);
    });

    it("accepts optional application metadata", async () => {
      const provider = new MockLLMProvider();

      await provider.generate({
        ...userRequest(),
        metadata: { interviewId: "int-1", step: "goals" },
      });

      expect(provider.requests[0]?.metadata).toEqual({
        interviewId: "int-1",
        step: "goals",
      });
    });

    it("accepts an optional system prompt and timeout", async () => {
      const provider = new MockLLMProvider();

      await provider.generate({
        ...userRequest(),
        system: "Return only facts from the answers.",
        timeoutMs: 5_000,
      });

      expect(provider.requests[0]?.system).toBe(
        "Return only facts from the answers.",
      );
      expect(provider.requests[0]?.timeoutMs).toBe(5_000);
    });
  });

  describe("mock provider", () => {
    it("returns a deterministic static response", async () => {
      const provider = new MockLLMProvider({ response: staticResponse });
      const request = userRequest();

      const first = await generateThroughPort(provider, request);
      const second = await generateThroughPort(provider, request);

      expect(first).toEqual(staticResponse);
      expect(second).toEqual(staticResponse);
    });

    it("captures the request sent through the provider port", async () => {
      const provider = new MockLLMProvider();
      const request: LLMRequest = {
        messages: [{ role: "user", content: "Name the users." }],
        model: "mock-small",
      };

      await generateThroughPort(provider, request);

      expect(provider.requests).toHaveLength(1);
      expect(provider.requests[0]).toEqual(request);
    });

    it("preserves request order across multiple calls", async () => {
      const provider = new MockLLMProvider();

      await provider.generate(userRequest("first"));
      await provider.generate(userRequest("second"));
      await provider.generate(userRequest("third"));

      expect(provider.requests.map((request) => request.messages[0]?.content)).toEqual(
        ["first", "second", "third"],
      );
    });

    it("preserves response model, usage, and finish reason", async () => {
      const provider = new MockLLMProvider({ response: staticResponse });

      const response = await provider.generate(userRequest());

      expect(response.model).toBe("mock-small");
      expect(response.usage).toEqual(usage);
      expect(response.finishReason).toBe("stop");
      expect(response.provider).toBe("mock");
    });

    it("supports a deterministic response function", async () => {
      const provider = new MockLLMProvider({
        response: (request) => ({
          content: `echo:${request.messages[0]?.content ?? ""}`,
          provider: "mock",
        }),
      });

      const response = await provider.generate(userRequest("alpha"));

      expect(response.content).toBe("echo:alpha");
    });
  });

  describe("registry", () => {
    it("registers and resolves a provider", () => {
      const registry = new LLMProviderRegistry();
      const provider = new MockLLMProvider({ id: "mock-a", name: "Mock A" });

      registry.register(provider);

      expect(registry.get("mock-a")).toBe(provider);
    });

    it("reports whether a provider is registered", () => {
      const registry = new LLMProviderRegistry();
      registry.register(new MockLLMProvider());

      expect(registry.has("mock")).toBe(true);
      expect(registry.has("missing")).toBe(false);
    });

    it("returns undefined for an unknown provider", () => {
      const registry = new LLMProviderRegistry();

      expect(registry.get("openai")).toBeUndefined();
    });

    it("throws a structured error that names an unknown required provider", () => {
      const registry = new LLMProviderRegistry();

      try {
        registry.require("anthropic");
        throw new Error("expected require to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect(error).toMatchObject({
          code: LLMErrorCode.INVALID_REQUEST,
          retryable: false,
        });
        expect((error as LLMError).message).toContain("anthropic");
      }
    });

    it("rejects duplicate provider registration", () => {
      const registry = new LLMProviderRegistry();
      registry.register(new MockLLMProvider({ id: "mock" }));

      expect(() => registry.register(new MockLLMProvider({ id: "mock" }))).toThrow(
        LLMError,
      );

      try {
        registry.register(new MockLLMProvider({ id: "mock" }));
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).message).toContain("already registered");
        expect(registry.get("mock")?.name).toBe("Mock");
      }
    });

    it("keeps multiple providers distinct", () => {
      const registry = new LLMProviderRegistry();
      const first = new MockLLMProvider({ id: "mock", name: "Mock" });
      const second = new MockLLMProvider({ id: "local", name: "Local" });

      registry.register(first);
      registry.register(second);

      expect(registry.ids()).toEqual(["mock", "local"]);
      expect(registry.require("local")).toBe(second);
      expect(registry.require("mock")).toBe(first);
    });
  });

  describe("errors", () => {
    it("exposes a stable error code", () => {
      const error = new LLMError(
        LLMErrorCode.AUTHENTICATION,
        "Provider authentication failed.",
      );

      expect(error.code).toBe(LLMErrorCode.AUTHENTICATION);
      expect(error.name).toBe("LLMError");
    });

    it("preserves provider identity", () => {
      const error = new LLMError(
        LLMErrorCode.RATE_LIMIT,
        "Provider rate limit exceeded.",
        { provider: "mock" },
      );

      expect(error.provider).toBe("mock");
    });

    it("marks rate limits, timeouts, and network failures as retryable", () => {
      expect(new LLMError(LLMErrorCode.RATE_LIMIT, "limited").retryable).toBe(true);
      expect(new LLMError(LLMErrorCode.TIMEOUT, "timed out").retryable).toBe(true);
      expect(new LLMError(LLMErrorCode.NETWORK, "offline").retryable).toBe(true);
      expect(new LLMError(LLMErrorCode.PROVIDER_ERROR, "unavailable").retryable).toBe(
        true,
      );
    });

    it("marks invalid requests and authentication failures as non-retryable", () => {
      expect(
        new LLMError(LLMErrorCode.INVALID_REQUEST, "bad request").retryable,
      ).toBe(false);
      expect(
        new LLMError(LLMErrorCode.AUTHENTICATION, "unauthorized").retryable,
      ).toBe(false);
    });

    it("preserves the original cause", () => {
      const cause = new Error("socket hang up");
      const error = new LLMError(LLMErrorCode.NETWORK, "Network request failed.", {
        cause,
      });

      expect(error.cause).toBe(cause);
    });

    it("redacts credential-like values from error messages", () => {
      const error = new LLMError(
        LLMErrorCode.AUTHENTICATION,
        "API request failed with Authorization: Bearer sk-secret-test-key and api_key=super-secret",
        { provider: "mock" },
      );

      expect(error.message).not.toContain("sk-secret-test-key");
      expect(error.message).not.toContain("super-secret");
      expect(error.message).not.toContain("Bearer sk-");
      expect(error.message).toContain("[REDACTED]");
      expect(error.message).not.toMatch(/process\.env/i);
    });
  });

  describe("validation", () => {
    it("rejects empty messages", async () => {
      const provider = new MockLLMProvider();

      await expect(
        provider.generate({ messages: [] }),
      ).rejects.toMatchObject({
        name: "LLMError",
        code: LLMErrorCode.INVALID_REQUEST,
        retryable: false,
      });
    });

    it("rejects an invalid temperature", async () => {
      const provider = new MockLLMProvider();

      await expect(
        provider.generate({
          ...userRequest(),
          temperature: 3,
        }),
      ).rejects.toBeInstanceOf(LLMError);
    });

    it("rejects an invalid maxTokens", async () => {
      const provider = new MockLLMProvider();

      await expect(
        provider.generate({
          ...userRequest(),
          maxTokens: 0,
        }),
      ).rejects.toMatchObject({
        code: LLMErrorCode.INVALID_REQUEST,
      });
    });

    it("rejects a malformed message", async () => {
      const provider = new MockLLMProvider();
      const request = {
        messages: [{ role: "tool", content: "not a supported role" }],
      } as unknown as LLMRequest;

      await expect(provider.generate(request)).rejects.toMatchObject({
        code: LLMErrorCode.INVALID_REQUEST,
        message: expect.stringContaining("invalid role"),
      });
    });
  });

  describe("determinism", () => {
    it("returns the same mock response for the same request", async () => {
      const provider = new MockLLMProvider({
        response: (request) => ({
          content: request.messages.map((message) => message.content).join("|"),
          provider: "mock",
          model: request.model,
        }),
      });
      const request: LLMRequest = {
        messages: [
          { role: "system", content: "Be brief." },
          { role: "user", content: "Summarize FieldKit." },
        ],
        model: "mock-small",
        temperature: 0,
      };

      const first = await provider.generate(request);
      const second = await provider.generate(request);

      expect(second).toEqual(first);
    });

    it("does not mutate the input request, messages, or metadata", async () => {
      const request: LLMRequest = {
        messages: [{ role: "user", content: "Keep this stable." }],
        metadata: { interviewId: "int-9" },
        model: "mock-small",
        temperature: 0.1,
        maxTokens: 64,
      };
      const before = JSON.stringify(request);
      Object.freeze(request);
      Object.freeze(request.messages);
      const firstMessage = request.messages[0];
      if (firstMessage) {
        Object.freeze(firstMessage);
      }
      Object.freeze(request.metadata);

      const provider = new MockLLMProvider({ response: staticResponse });
      await provider.generate(request);
      const captured = provider.requests[0];
      const capturedMetadata = captured?.metadata;
      if (capturedMetadata) {
        (capturedMetadata as { interviewId?: string }).interviewId = "mutated";
      }

      expect(JSON.stringify(request)).toBe(before);
      expect(request.metadata).toEqual({ interviewId: "int-9" });
    });
  });
});
