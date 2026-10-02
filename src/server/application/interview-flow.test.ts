import { describe, expect, it } from "vitest";
import { LLMError, LLMErrorCode } from "../../core/llm/errors";
import { MockLLMProvider } from "../../core/llm/mock";
import { createRequireAuth } from "../auth/require-auth";
import { AuthErrorCode } from "../persistence/errors";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createInterviewFlow } from "./interview-flow";

function structured(question: string, payload: Record<string, unknown>): string {
  return `QUESTION:\n${question}\n\n<structured>\n${JSON.stringify(payload)}\n</structured>`;
}

const discoveryPatch = {
  project: {
    name: "FieldKit",
    description: "A field toolkit.",
    problem: "Scattered visit notes.",
    targetUsers: ["Dispatchers"],
    type: "web application",
  },
};

function flow(options?: {
  userId?: string | null;
  provider?: MockLLMProvider;
}) {
  const store = createMemoryStore();
  const ids = { next: () => "sess-1" };
  const requireAuth = createRequireAuth(async () => ({
    userId: options?.userId === undefined ? "user_a" : options.userId,
  }));

  return {
    store,
    projects: createMemoryProjectRepository(store),
    interviews: createMemoryInterviewRepository(store),
    flow: createInterviewFlow({
      requireAuth,
      projects: createMemoryProjectRepository(store),
      interviews: createMemoryInterviewRepository(store),
      createProvider: () =>
        options?.provider ??
        new MockLLMProvider({
          response: {
            content: structured("What are you building?", { patch: {} }),
            provider: "mock",
          },
        }),
      ids,
    }),
  };
}

describe("interview flow", () => {
  it("rejects an unauthenticated start", async () => {
    const { flow: interview } = flow({ userId: null });

    await expect(interview.startProject()).rejects.toMatchObject({
      code: AuthErrorCode.UNAUTHENTICATED,
    });
  });

  it("returns a safe failure when a project cannot be created", async () => {
    const store = createMemoryStore();
    const interview = createInterviewFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_a" })),
      projects: {
        ...createMemoryProjectRepository(store),
        createProject: async () => {
          throw new Error("insert failed");
        },
      },
      interviews: createMemoryInterviewRepository(store),
      createProvider: () =>
        new MockLLMProvider({
          response: {
            content: structured("What are you building?", { patch: {} }),
            provider: "mock",
          },
        }),
    });

    const result = await interview.startProject();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error?.message).not.toContain("insert failed");
    }
  });

  it("creates a project, opens a session, and returns a view model", async () => {
    const { flow: interview, store } = flow();
    const result = await interview.startProject();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.view.sessionId).toBe("sess-1");
    expect(result.view.messages.at(-1)?.content ?? result.view.currentQuestion?.text).toContain(
      "What are you building?",
    );
    expect(store.projects.size).toBe(1);
    expect(store.sessions.size).toBe(1);
    expect([...store.projects.values()][0]?.spec).toEqual(
      [...store.sessions.values()][0]?.session.spec,
    );
  });

  it("loads a persisted session on resume", async () => {
    const { flow: interview } = flow();
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const loaded = await interview.loadInterview(started.view.projectId);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    expect(loaded.view.sessionId).toBe(started.view.sessionId);
    expect(loaded.view.phase).toBe(started.view.phase);
    expect(loaded.view.messages).toEqual(started.view.messages);
  });

  it("creates a session when an owned project has none", async () => {
    const { flow: interview, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: {
        project: {
          name: "FieldKit",
          description: "Toolkit",
          problem: "Notes",
          targetUsers: ["Dispatchers"],
          type: "web application",
          status: "draft",
        },
      },
      id: "proj-existing",
    });

    const loaded = await interview.loadInterview(project.id);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.view.projectId).toBe("proj-existing");
      expect(loaded.view.sessionId).toBe("sess-1");
    }
  });

  it("hides another user's project", async () => {
    const ownerA = flow({ userId: "user_a" });
    const started = await ownerA.flow.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const ownerB = createInterviewFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: createMemoryProjectRepository(ownerA.store),
      interviews: createMemoryInterviewRepository(ownerA.store),
      createProvider: () =>
        new MockLLMProvider({
          response: {
            content: structured("Next?", { patch: {} }),
            provider: "mock",
          },
        }),
    });

    const result = await ownerB.loadInterview(started.view.projectId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).not.toContain("user_a");
    }
  });

  it("routes an answer through InterviewEngine and persists both records", async () => {
    const provider = new MockLLMProvider({
      response: (request) => {
        const phase = request.metadata?.phase;
        if (phase === "discovery" && request.messages[0]?.content.includes("Latest user answer")) {
          return {
            content: structured("What is the main goal?", { patch: discoveryPatch }),
            provider: "mock",
          };
        }

        return {
          content: structured("What are you building?", { patch: {} }),
          provider: "mock",
        };
      },
    });
    const { flow: interview, store } = flow({ provider });
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const submitted = await interview.submitAnswer({
      projectId: started.view.projectId,
      sessionId: started.view.sessionId,
      answer: "A field-service toolkit.",
    });

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }

    expect(submitted.view.phase).toBe("goals");
    expect(submitted.view.messages.some((message) => message.role === "user")).toBe(
      true,
    );
    const project = [...store.projects.values()][0];
    const session = [...store.sessions.values()][0];
    expect(project?.spec).toEqual(session?.session.spec);
    expect(project?.name).toBe("FieldKit");
    expect(provider.requests.length).toBeGreaterThan(1);
  });

  it("rejects an empty answer before calling the engine", async () => {
    const { flow: interview } = flow();
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const result = await interview.submitAnswer({
      projectId: started.view.projectId,
      sessionId: started.view.sessionId,
      answer: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error?.code).toBe("INVALID_ANSWER");
    }
  });

  it("returns a safe provider error", async () => {
    const provider = new MockLLMProvider({
      response: (request) => {
        if (request.messages[0]?.content.includes("Latest user answer")) {
          throw new LLMError(LLMErrorCode.RATE_LIMIT, "rate limited", {
            provider: "mock",
          });
        }

        return {
          content: structured("What are you building?", { patch: {} }),
          provider: "mock",
        };
      },
    });
    const { flow: interview } = flow({ provider });
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const result = await interview.submitAnswer({
      projectId: started.view.projectId,
      sessionId: started.view.sessionId,
      answer: "A toolkit.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.error?.code).toBe("PROVIDER_ERROR");
      expect(result.view.error?.message).not.toContain("rate limited");
      expect(result.view.error?.message).not.toContain("sk-");
    }
  });

  it("restores a completed session without asking for another answer", async () => {
    const { flow: interview, interviews, store } = flow();
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const current = [...store.sessions.values()][0];
    if (!current) {
      throw new Error("missing session");
    }

    await interviews.updateInterviewSession({
      sessionId: current.id,
      ownerId: "user_a",
      session: {
        ...current.session,
        phase: "complete",
        completed: true,
      },
    });

    const loaded = await interview.loadInterview(started.view.projectId);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.view.completed).toBe(true);
      expect(loaded.view.phase).toBe("complete");
    }
  });

  it("rejects submitting an answer to another user's interview", async () => {
    const ownerA = flow({ userId: "user_a" });
    const started = await ownerA.flow.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const ownerB = createInterviewFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: createMemoryProjectRepository(ownerA.store),
      interviews: createMemoryInterviewRepository(ownerA.store),
      createProvider: () =>
        new MockLLMProvider({
          response: {
            content: structured("Next?", { patch: {} }),
            provider: "mock",
          },
        }),
    });

    const result = await ownerB.submitAnswer({
      projectId: started.view.projectId,
      sessionId: started.view.sessionId,
      answer: "Should not persist.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error?.code).toBe("NOT_FOUND");
    }
  });

  it("continues the interview when the model output is unusable", async () => {
    const provider = new MockLLMProvider({
      response: (request) => {
        if (request.messages[0]?.content.includes("Latest user answer")) {
          return {
            content: "QUESTION:\nNext?\n\n<structured>\nnot-json\n</structured>",
            provider: "mock",
          };
        }

        return {
          content: structured("What are you building?", { patch: {} }),
          provider: "mock",
        };
      },
    });
    const { flow: interview } = flow({ provider });
    const started = await interview.startProject();
    if (!started.ok) {
      throw new Error("start failed");
    }

    const result = await interview.submitAnswer({
      projectId: started.view.projectId,
      sessionId: started.view.sessionId,
      answer: "A toolkit.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.error).toBeUndefined();
      expect(result.view.phase).toBe("goals");
      expect(result.view.messages.at(-1)?.content).toBe(
        "What's the main outcome you want first?",
      );
    }
  });
});
