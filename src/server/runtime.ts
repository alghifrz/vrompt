import "server-only";
import { requireAuth } from "./auth/clerk-auth";
import { createInterviewFlow } from "./application/interview-flow";
import { createGenerationFlow } from "./application/generation-flow";
import { createReviewFlow } from "./application/review-flow";
import { getDb } from "./db/client";
import { createDevelopmentLLMProvider } from "./llm/development-provider";
import { createInterviewRepository } from "./repositories/interviews";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "./repositories/memory";
import { createProjectRepository } from "./repositories/projects";
import { resolvePersistenceMode } from "./runtime-mode";

const globalForMemory = globalThis as typeof globalThis & {
  __vromptMemory?: ReturnType<typeof createMemoryStore>;
};

function memoryStore() {
  globalForMemory.__vromptMemory ??= createMemoryStore();
  return globalForMemory.__vromptMemory;
}

function repositories() {
  if (resolvePersistenceMode() === "postgres") {
    const db = getDb();
    return {
      projects: createProjectRepository(db),
      interviews: createInterviewRepository(db),
    };
  }

  const store = memoryStore();
  return {
    projects: createMemoryProjectRepository(store),
    interviews: createMemoryInterviewRepository(store),
  };
}

export function getInterviewFlow() {
  const { projects, interviews } = repositories();
  return createInterviewFlow({
    requireAuth,
    projects,
    interviews,
    createProvider: createDevelopmentLLMProvider,
  });
}

export function getReviewFlow() {
  const { projects } = repositories();
  return createReviewFlow({
    requireAuth,
    projects,
  });
}

export function getGenerationFlow() {
  const { projects } = repositories();
  return createGenerationFlow({
    requireAuth,
    projects,
  });
}
