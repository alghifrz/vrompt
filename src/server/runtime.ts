import "server-only";
import { requireAuth } from "./auth/clerk-auth";
import { createInterviewFlow } from "./application/interview-flow";
import { createGenerationFlow } from "./application/generation-flow";
import { createProjectService } from "./application/project-service";
import { createReviewFlow } from "./application/review-flow";
import { createWorkspaceFlow } from "./application/workspace-flow";
import { toWorkspaceProject, type WorkspaceProject } from "../lib/workspace/projects";
import { getDb } from "./db/client";
import { createInterviewLLMProvider } from "./llm/create-provider";
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
    createProvider: createInterviewLLMProvider,
  });
}

export function getReviewFlow() {
  const { projects } = repositories();
  return createReviewFlow({
    requireAuth,
    projects,
    createProvider: createInterviewLLMProvider,
  });
}

export function getGenerationFlow() {
  const { projects } = repositories();
  return createGenerationFlow({
    requireAuth,
    projects,
  });
}

export function getProjectService() {
  const { projects } = repositories();
  return createProjectService(requireAuth, projects);
}

export function getWorkspaceFlow() {
  const { projects, interviews } = repositories();
  return createWorkspaceFlow({
    requireAuth,
    projects,
    interviews,
  });
}

export async function listWorkspaceProjects(): Promise<WorkspaceProject[]> {
  const records = await getProjectService().list();
  return records
    .slice()
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .map((project) =>
      toWorkspaceProject({
        id: project.id,
        name: project.name,
        status: project.status,
      }),
    );
}
