import { describe, expect, it } from "vitest";
import { LLMError, LLMErrorCode } from "../llm/errors";
import { MockLLMProvider } from "../llm/mock";
import type { LLMRequest, LLMResponse } from "../llm/types";
import type { ProjectSpec } from "../schema/project-spec";
import { InterviewEngine, createInterviewSession } from "./engine";
import { InterviewError, InterviewErrorCode } from "./errors";
import { parseInterviewResponse } from "./extraction";
import { commitProjectSpecPatch, mergeProjectSpec } from "./merge";
import { INITIAL_PROJECT } from "./phases";
import {
  buildInterviewSystemPrompt,
  buildInterviewUserPrompt,
} from "./prompts";
import type { InterviewSession } from "./types";

function structuredResponse(
  question: string,
  payload: Record<string, unknown>,
): string {
  return `QUESTION:\n${question}\n\n<structured>\n${JSON.stringify(payload)}\n</structured>`;
}

function mockResponse(content: string): LLMResponse {
  return { content, provider: "mock", finishReason: "stop" };
}

function scriptedProvider(contents: string[]): MockLLMProvider {
  let index = 0;
  return new MockLLMProvider({
    response: () => {
      const content = contents[Math.min(index, contents.length - 1)] ?? "";
      index += 1;
      return mockResponse(content);
    },
  });
}

const discoveryPatch = {
  project: {
    name: "FieldKit",
    description: "A field-service toolkit.",
    problem: "Visit details live in separate tools.",
    targetUsers: ["Dispatchers"],
    type: "web application",
  },
};

const goalsPatch = {
  goals: {
    primary: [{ id: "goal-schedule", statement: "Assign visits without conflicts." }],
    successCriteria: ["A dispatcher can assign a visit quickly."],
  },
};

const featuresPatch = {
  features: [
    {
      id: "feature-board",
      name: "Visit board",
      description: "Show today's visits.",
      priority: "must" as const,
      status: "planned" as const,
      acceptanceCriteria: ["The board lists today's visits."],
    },
  ],
};

const usersPatch = {
  users: [
    {
      id: "user-dispatcher",
      name: "Dispatcher",
      description: "Coordinates schedules.",
      goals: ["Assign visits"],
      permissions: ["manage-visits"],
    },
  ],
};

async function runScriptedTurns(
  answers: string[],
  contents: string[],
): Promise<{ engine: InterviewEngine; session: InterviewSession; provider: MockLLMProvider }> {
  const provider = scriptedProvider(contents);
  const engine = new InterviewEngine(provider);
  let session = createInterviewSession({ id: "int-1" });

  for (const answer of answers) {
    const result = await engine.runTurn(session, answer);
    session = result.session;
  }

  return { engine, session, provider };
}

describe("InterviewEngine", () => {
  describe("session", () => {
    it("creates an initial discovery session", () => {
      const session = createInterviewSession({ id: "int-1" });

      expect(session.id).toBe("int-1");
      expect(session.phase).toBe("discovery");
      expect(session.completed).toBe(false);
      expect(session.messages).toEqual([]);
      expect(session.spec.project).toEqual({
        name: INITIAL_PROJECT.name,
        description: INITIAL_PROJECT.description,
        problem: INITIAL_PROJECT.problem,
        targetUsers: [...INITIAL_PROJECT.targetUsers],
        type: INITIAL_PROJECT.type,
        status: "draft",
      });
    });

    it("uses the supplied session id", () => {
      expect(createInterviewSession({ id: " custom-id " }).id).toBe("custom-id");
    });

    it("rejects an empty session id", () => {
      expect(() => createInterviewSession({ id: "   " })).toThrow(InterviewError);
    });

    it("does not share global session state", () => {
      const first = createInterviewSession({ id: "a" });
      const second = createInterviewSession({ id: "b" });

      expect(first).not.toBe(second);
      expect(first.spec).not.toBe(second.spec);
      expect(first.messages).not.toBe(second.messages);
    });
  });

  describe("messages", () => {
    it("appends the user answer and preserves previous messages", async () => {
      const provider = scriptedProvider([
        structuredResponse("What is the problem?", { patch: discoveryPatch }),
        structuredResponse("What is the main goal?", { patch: goalsPatch }),
      ]);
      const engine = new InterviewEngine(provider);
      const initial = createInterviewSession({ id: "int-1" });

      const first = await engine.runTurn(initial, "A field toolkit.");
      const second = await engine.runTurn(first.session, "Avoid double booking.");

      expect(second.session.messages.map((message) => message.role)).toEqual([
        "user",
        "assistant",
        "user",
        "assistant",
      ]);
      expect(second.session.messages[0]?.content).toBe("A field toolkit.");
      expect(second.session.messages[2]?.content).toBe("Avoid double booking.");
    });

    it("does not mutate the original session, spec, or messages", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What problem does it solve?", {
            patch: discoveryPatch,
          }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const spec = session.spec;
      const messages = session.messages;
      const before = JSON.stringify(session);

      Object.freeze(session);
      Object.freeze(session.spec);
      Object.freeze(session.spec.project);
      Object.freeze(session.messages);

      await engine.runTurn(session, "Field service software.");

      expect(JSON.stringify(session)).toBe(before);
      expect(session.messages).toBe(messages);
      expect(session.spec).toBe(spec);
      expect(session.phase).toBe("discovery");
    });
  });

  describe("prompting", () => {
    it("includes the current phase, draft, and latest answer", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Who uses it?", { patch: discoveryPatch }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-22" });

      await engine.runTurn(session, "Dispatchers need a visit board.");

      const request = provider.requests[0] as LLMRequest;
      expect(request.system).toContain("Current engine-controlled phase: discovery");
      expect(request.messages[0]?.content).toContain("Current phase: discovery");
      expect(request.messages[0]?.content).toContain("Untitled project");
      expect(request.messages[0]?.content).toContain(
        "Latest user answer:\nDispatchers need a visit board.",
      );
      expect(request.metadata).toEqual({
        interviewId: "int-22",
        phase: "discovery",
      });
    });

    it("builds deterministic prompts for the same session", () => {
      const session = createInterviewSession({ id: "int-1" });

      expect(buildInterviewSystemPrompt(session.phase)).toBe(
        buildInterviewSystemPrompt("discovery"),
      );
      expect(buildInterviewUserPrompt(session, "same")).toBe(
        buildInterviewUserPrompt(session, "same"),
      );
    });
  });

  describe("extraction", () => {
    it("extracts a valid structured patch", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What is the first goal?", { patch: discoveryPatch }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit for dispatchers.",
      );

      expect(result.extracted).toBe(true);
      expect(result.session.spec.project.name).toBe("FieldKit");
      expect(result.session.phase).toBe("goals");
    });

    it("stays in discovery and asks when the idea is still too thin", async () => {
      const started = {
        ...createInterviewSession({ id: "int-1" }),
        messages: [{ role: "assistant" as const, content: "What are you building?" }],
        currentQuestion: {
          id: "q-discovery-1",
          phase: "discovery" as const,
          text: "What are you building?",
          required: true,
        },
        questionSeq: 1,
      };
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Pekerjaan pertama yang harus bisa diselesaikan user di aplikasi ini apa?", {
            clarify: true,
            patch: {},
          }),
        ),
      });
      const result = await new InterviewEngine(provider).runTurn(started, "mau bikin app");

      expect(result.session.phase).toBe("discovery");
      expect(result.session.spec.project.name).toBe(INITIAL_PROJECT.name);
      expect(result.question?.text).toMatch(/pekerjaan pertama|first job/i);
    });

    it("accepts fenced JSON without a structured tag", async () => {
      const parsed = parseInterviewResponse(
        `QUESTION:\nNext?\n\n\`\`\`json\n${JSON.stringify({ patch: discoveryPatch })}\n\`\`\``,
      );

      expect(parsed.error).toBeUndefined();
      expect(parsed.extraction?.patch?.project?.name).toBe("FieldKit");
    });

    it("accepts structured JSON surrounded by explanation", () => {
      const parsed = parseInterviewResponse(
        `Here is the update.\nQUESTION:\nWhat is the goal?\n<structured>\n${JSON.stringify({ patch: goalsPatch })}\n</structured>\nThanks.`,
      );

      expect(parsed.extraction?.patch?.goals?.primary[0]?.id).toBe("goal-schedule");
      expect(parsed.question).toBe("What is the goal?");
    });

    it("continues when the structured section is missing but a question exists", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse("QUESTION:\nWhat is the project name?"),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const result = await engine.runTurn(session, "FieldKit");

      expect(result.error).toBeUndefined();
      expect(result.session.spec.project.name).toBe("FieldKit");
      expect(result.session.phase).toBe("goals");
      expect(result.question?.text).toBe("What's the main outcome you want first?");
    });

    it("continues on malformed JSON when a question exists", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          "QUESTION:\nTry again\n<structured>\n{ patch: }\n</structured>",
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit",
      );

      expect(result.error).toBeUndefined();
      expect(result.session.phase).toBe("goals");
      expect(result.question?.text).toBe("What's the main outcome you want first?");
    });

    it("advances after one answer even when the model returns an empty patch", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Can you name the product?", { patch: {} }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const result = await engine.runTurn(session, "Still thinking.");

      expect(result.extracted).toBe(true);
      expect(result.session.spec.project.name).toBe("Still Thinking");
      expect(result.session.spec.project.description).not.toBe("Still thinking.");
      expect(result.session.phase).toBe("goals");
    });

    it("ignores an invalid patch item and keeps the previous draft", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What priority?", {
            patch: {
              features: [
                {
                  id: "feature-board",
                  name: "Board",
                  description: "Show work.",
                  priority: "critical",
                  status: "planned",
                  acceptanceCriteria: [],
                },
              ],
            },
          }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const result = await engine.runTurn(session, "Add a board.");

      expect(result.extracted).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.session.spec.features).toBeUndefined();
      expect(result.session.phase).toBe("goals");
    });

    it("strips unknown patch fields and keeps supported facts", () => {
      const parsed = parseInterviewResponse(
        `<structured>${JSON.stringify({
          patch: { project: { name: "FieldKit" }, extra: true },
        })}</structured>`,
      );

      expect(parsed.error).toBeUndefined();
      expect(parsed.extraction?.patch?.project?.name).toBe("FieldKit");
    });
  });

  describe("merge", () => {
    const base = createInterviewSession({ id: "int-1" }).spec;

    it("merges project fields without dropping existing values", () => {
      const first = mergeProjectSpec(base, {
        project: { name: "FieldKit", description: "Toolkit." },
      });
      const second = mergeProjectSpec(first, {
        project: { problem: "Scattered notes.", type: "web application" },
      });

      expect(second.project.name).toBe("FieldKit");
      expect(second.project.description).toBe("Toolkit.");
      expect(second.project.problem).toBe("Scattered notes.");
    });

    it("adds a new feature and updates an existing feature by id", () => {
      const withFeature = mergeProjectSpec(base, featuresPatch);
      const updated = mergeProjectSpec(withFeature, {
        features: [
          {
            id: "feature-board",
            name: "Visit board",
            description: "Updated board.",
            priority: "must",
            status: "approved",
            acceptanceCriteria: ["Visible after refresh."],
          },
          {
            id: "feature-notes",
            name: "Notes",
            description: "Offline notes.",
            priority: "should",
            status: "planned",
            acceptanceCriteria: [],
          },
        ],
      });

      expect(updated.features).toHaveLength(2);
      expect(updated.features?.[0]?.description).toBe("Updated board.");
      expect(updated.features?.[0]?.status).toBe("approved");
      expect(updated.features?.[1]?.id).toBe("feature-notes");
    });

    it("does not create duplicate features for the same id", () => {
      const once = mergeProjectSpec(base, featuresPatch);
      const twice = mergeProjectSpec(once, featuresPatch);

      expect(twice.features).toHaveLength(1);
    });

    it("merges users and AI rules by id", () => {
      const patched = mergeProjectSpec(base, {
        ...usersPatch,
        aiRules: [
          {
            id: "rule-core",
            title: "Keep domain pure",
            priority: "must",
            activationMode: "always",
            body: "No UI imports in domain.",
            rationale: "Portability.",
          },
        ],
      });

      expect(patched.users?.[0]?.id).toBe("user-dispatcher");
      expect(patched.aiRules?.[0]?.id).toBe("rule-core");
    });

    it("does not mutate the current spec", () => {
      const before = JSON.stringify(base);
      mergeProjectSpec(base, discoveryPatch);
      expect(JSON.stringify(base)).toBe(before);
    });

    it("rejects a merged spec that fails ProjectSpec validation", () => {
      const result = commitProjectSpecPatch(base, {
        project: { targetUsers: [] },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(InterviewErrorCode.SPEC_INVALID);
      }
    });

    it("preserves the previous draft when a merged spec is invalid", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Who uses it?", {
            patch: { project: { targetUsers: [] } },
          }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const result = await engine.runTurn(session, "Nobody yet.");

      expect(result.error).toBeUndefined();
      expect(result.session.spec.project.targetUsers).toEqual(["Primary users"]);
      expect(result.session.phase).toBe("goals");
    });
  });

  describe("phase progression", () => {
    it("advances discovery only after real project identity exists", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What is the goal?", { patch: discoveryPatch }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit",
      );

      expect(result.session.phase).toBe("goals");
      expect(result.session.completed).toBe(false);
    });

    it("advances goals, features, and users when those sections exist", async () => {
      const { session } = await runScriptedTurns(
        ["idea", "goals", "features", "users"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
        ],
      );

      expect(session.phase).toBe("stack");
      expect(session.spec.goals?.primary).toHaveLength(1);
      expect(session.spec.features).toHaveLength(1);
      expect(session.spec.users).toHaveLength(1);
    });

    it("interprets casual stack talk even if the model dumps it into additional", async () => {
      const { session } = await runScriptedTurns(
        [
          "idea",
          "goals",
          "features",
          "users",
          "untuk fe gw mau pakai react aja, trus backend pakai golang",
        ],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("Architecture?", {
            patch: {
              stack: {
                additional: [
                  "untuk fe gw mau pakai react aja, trus backend pakai golang",
                ],
              },
            },
          }),
        ],
      );

      expect(session.spec.stack?.frontend).toBe("React");
      expect(session.spec.stack?.backend).toBe("Go");
      expect(session.spec.stack?.additional ?? []).toEqual([]);
      expect(session.phase).toBe("architecture");
    });

    it("completes stack when any stack field is present", async () => {
      const { session } = await runScriptedTurns(
        ["idea", "goals", "features", "users", "React"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("Architecture?", {
            patch: { stack: { frontend: "React" } },
          }),
        ],
      );

      expect(session.spec.stack?.frontend).toBe("React");
      expect(session.phase).toBe("architecture");
    });

    it("recommends beginner defaults when optional technical answers are unknown", async () => {
      const { session } = await runScriptedTurns(
        ["idea", "goals", "features", "users", "gatau", "gatau", "gatau", "gatau", "gatau", "gatau"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("I recommend Next.js because it stays one app. Architecture?", {
            patch: {},
          }),
          structuredResponse("Database?", { patch: {} }),
          structuredResponse("API?", { patch: {} }),
          structuredResponse("Security?", { patch: {} }),
          structuredResponse("Rules?", { patch: {} }),
          structuredResponse("Please confirm this project specification.", {
            patch: {},
          }),
        ],
      );

      expect(session.spec.stack?.frontend).toBe("Next.js");
      expect(session.spec.database?.entities?.length).toBeGreaterThan(0);
      expect(session.spec.api?.endpoints.length).toBeGreaterThan(0);
      expect(session.completed).toBe(false);
      expect(session.phase).toBe("review");
    });

    it("treats agreement as accepting the recommendation and moves on", async () => {
      const session = {
        ...createInterviewSession({ id: "int-1" }),
        phase: "security" as const,
      };
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse(
            "For authentication, would you like Firebase Auth or Supabase Auth? Recommended: hosted auth.",
            { patch: { security: {} } },
          ),
        ),
      });
      const result = await new InterviewEngine(provider).runTurn(
        session,
        "iiya setuju",
      );

      expect(result.session.phase).toBe("ai_rules");
      expect(result.session.spec.security?.authentication?.[0]).toMatch(/hosted auth/i);
      expect(result.question?.text).toContain("hosted auth");
      expect(result.question?.text).toContain("coding agent");
      expect(result.question?.text).not.toMatch(/Firebase Auth/i);
    });

    it("skips a technical phase only when the user says it is not needed", async () => {
      const { session } = await runScriptedTurns(
        ["idea", "goals", "features", "users", "tidak perlu"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("Architecture?", { skip: true }),
        ],
      );

      expect(session.skippedPhases).toContain("stack");
      expect(session.spec.stack).toBeUndefined();
      expect(session.phase).toBe("architecture");
    });

    it("treats AI rules as optional", async () => {
      const { session } = await runScriptedTurns(
        ["idea", "goals", "features", "users", "s", "a", "d", "api", "sec", "none"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("Architecture?", { skip: true }),
          structuredResponse("Database?", { skip: true }),
          structuredResponse("API?", { skip: true }),
          structuredResponse("Security?", { skip: true }),
          structuredResponse("Rules?", { skip: true }),
          structuredResponse("Please confirm this project specification.", {
            patch: { aiRules: [] },
          }),
        ],
      );

      expect(session.spec.aiRules?.some((rule) => rule.id === "rule-keep-scope")).toBe(true);
      expect(session.spec.aiRules?.length).toBeGreaterThanOrEqual(2);
      expect(session.phase).toBe("review");
    });
  });

  describe("completion", () => {
    async function reachReview(): Promise<{
      engine: InterviewEngine;
      session: InterviewSession;
    }> {
      const walked = await runScriptedTurns(
        ["idea", "goals", "features", "users", "s", "a", "d", "api", "sec", "rules"],
        [
          structuredResponse("Goals?", { patch: discoveryPatch }),
          structuredResponse("Features?", { patch: goalsPatch }),
          structuredResponse("Users?", { patch: featuresPatch }),
          structuredResponse("Stack?", { patch: usersPatch }),
          structuredResponse("Architecture?", { skip: true }),
          structuredResponse("Database?", { skip: true }),
          structuredResponse("API?", { skip: true }),
          structuredResponse("Security?", { skip: true }),
          structuredResponse("Rules?", { skip: true }),
          structuredResponse("Please confirm this project specification.", {
            skip: true,
          }),
        ],
      );

      return walked;
    }

    it("cannot complete during discovery even if the model sets confirm", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What is the goal?", {
            patch: discoveryPatch,
            confirm: true,
          }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(
        createInterviewSession({ id: "int-1" }),
        "I confirm this is done.",
      );

      expect(result.session.completed).toBe(false);
      expect(result.session.phase).toBe("goals");
    });

    it("requires explicit user confirmation in review", async () => {
      const { session } = await reachReview();
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Please confirm this project specification.", {
            confirm: true,
          }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(session, "I still need to think.");

      expect(result.session.completed).toBe(false);
      expect(result.session.phase).toBe("review");
    });

    it("completes after confirmed review", async () => {
      const { session } = await reachReview();
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Interview complete.", { confirm: true }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.runTurn(session, "confirm");

      expect(result.session.phase).toBe("complete");
      expect(result.session.completed).toBe(true);
      expect(result.completed).toBe(true);
    });

    it("does not continue a completed interview", async () => {
      const { session } = await reachReview();
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Done.", { confirm: true }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const completed = await engine.runTurn(session, "yes");
      const again = await engine.runTurn(completed.session, "one more thing");

      expect(again.error?.code).toBe(InterviewErrorCode.COMPLETION_ERROR);
      expect(again.session.completed).toBe(true);
      expect(again.extracted).toBe(false);
    });
  });

  describe("provider", () => {
    it("uses the provider-neutral port and records the request", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What is the problem?", { patch: {} }),
        ),
      });
      const engine = new InterviewEngine(provider);

      await engine.runTurn(createInterviewSession({ id: "int-1" }), "Hello");

      expect(provider.requests).toHaveLength(1);
      expect(provider.requests[0]?.temperature).toBe(0.3);
    });

    it("propagates a provider rate-limit error with the original cause", async () => {
      const rateLimit = new LLMError(
        LLMErrorCode.RATE_LIMIT,
        "Provider rate limit exceeded.",
        { provider: "mock" },
      );
      const provider = new MockLLMProvider({
        response: () => {
          throw rateLimit;
        },
      });
      const engine = new InterviewEngine(provider);
      const session = createInterviewSession({ id: "int-1" });
      const result = await engine.runTurn(session, "FieldKit");

      expect(result.error?.code).toBe(InterviewErrorCode.PROVIDER_ERROR);
      expect(result.error?.cause).toBe(rateLimit);
      expect((result.error?.cause as LLMError).code).toBe(LLMErrorCode.RATE_LIMIT);
      expect(result.error?.retryable).toBe(true);
      expect(result.session.spec.project.name).toBe(INITIAL_PROJECT.name);
    });

    it("is deterministic for the same session, answer, and provider response", async () => {
      const content = structuredResponse("What is the goal?", {
        patch: discoveryPatch,
      });
      const firstProvider = new MockLLMProvider({ response: mockResponse(content) });
      const secondProvider = new MockLLMProvider({
        response: mockResponse(content),
      });
      const first = await new InterviewEngine(firstProvider).runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit",
      );
      const second = await new InterviewEngine(secondProvider).runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit",
      );

      expect(second.session.phase).toBe(first.session.phase);
      expect(second.session.spec).toEqual(first.session.spec);
      expect(second.question?.id).toBe(first.question?.id);
      expect(second.extracted).toBe(first.extracted);
    });

    it("starts an interview with an opening question", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("What are you building?", { patch: {} }),
        ),
      });
      const engine = new InterviewEngine(provider);
      const result = await engine.start(createInterviewSession({ id: "int-1" }));

      expect(result.session.currentQuestion?.text).toBe("What are you building?");
      expect(result.session.currentQuestion?.id).toBe("q-discovery-1");
      expect(result.session.messages[0]?.role).toBe("assistant");
    });
  });

  describe("validation", () => {
    it("rejects an empty user answer", async () => {
      const engine = new InterviewEngine(new MockLLMProvider());
      const result = await engine.runTurn(
        createInterviewSession({ id: "int-1" }),
        "   ",
      );

      expect(result.error?.code).toBe(InterviewErrorCode.INVALID_ANSWER);
      expect(result.session.messages).toEqual([]);
    });

    it("assigns deterministic question ids from the engine, not the model", async () => {
      const provider = new MockLLMProvider({
        response: mockResponse(
          structuredResponse("Name the users.", { patch: discoveryPatch }),
        ),
      });
      const result = await new InterviewEngine(provider).runTurn(
        createInterviewSession({ id: "int-1" }),
        "FieldKit",
      );

      expect(result.question?.id).toBe("q-goals-1");
      expect(result.question?.phase).toBe("goals");
    });
  });
});

describe("interview helpers", () => {
  it("does not treat placeholder drafts as a complete ProjectSpec identity", () => {
    const spec: ProjectSpec = createInterviewSession({ id: "int-1" }).spec;
    expect(spec.project.name).toBe("Untitled project");
    expect(spec.project.status).toBe("draft");
  });
});
