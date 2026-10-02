import { describe, expect, it } from "vitest";
import { createInitialProjectSpec, createInterviewSession } from "../../core/interview/engine";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { createRequireAuth } from "../auth/require-auth";
import { AuthErrorCode } from "../persistence/errors";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createWorkspaceFlow } from "./workspace-flow";

const spec: ProjectSpec = {
  ...createInitialProjectSpec(),
  project: {
    ...createInitialProjectSpec().project,
    name: "FieldKit",
    description: "A field toolkit.",
  },
};

function workspace(userId: string | null = "user_a") {
  const store = createMemoryStore();
  const projects = createMemoryProjectRepository(store);
  const interviews = createMemoryInterviewRepository(store);
  const flow = createWorkspaceFlow({
    requireAuth: createRequireAuth(async () => ({ userId })),
    projects,
    interviews,
  });

  return { store, projects, interviews, flow };
}

describe("workspace flow", () => {
  it("rejects an unauthenticated rename", async () => {
    const { flow } = workspace(null);

    await expect(flow.renameProject("proj-1", "Renamed")).rejects.toMatchObject({
      code: AuthErrorCode.UNAUTHENTICATED,
    });
  });

  it("renames the owned project and its interview session", async () => {
    const { flow, projects, interviews, store } = workspace();
    const project = await projects.createProject({ ownerId: "user_a", spec });
    await interviews.createInterviewSession({
      ownerId: "user_a",
      projectId: project.id,
      session: createInterviewSession({ id: "sess-1" }),
    });

    const result = await flow.renameProject(project.id, "  Field Kit  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project).toEqual({
        id: project.id,
        name: "Field Kit",
        status: "draft",
        stage: "interview",
        href: `/interview/${project.id}`,
      });
      expect(result.project).not.toHaveProperty("ownerId");
    }

    expect(store.projects.get(project.id)?.spec.project.name).toBe("Field Kit");
    expect(store.sessions.get("sess-1")?.session.spec.project.name).toBe(
      "Field Kit",
    );
  });

  it("hides another user's project on rename", async () => {
    const ownerA = workspace("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec,
    });

    const ownerB = createWorkspaceFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
      interviews: ownerA.interviews,
    });

    const result = await ownerB.renameProject(project.id, "Hijacked");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).not.toContain("user_a");
    }
    expect(ownerA.store.projects.get(project.id)?.spec.project.name).toBe(
      "FieldKit",
    );
  });

  it("rejects an empty name", async () => {
    const { flow, projects } = workspace();
    const project = await projects.createProject({ ownerId: "user_a", spec });

    const result = await flow.renameProject(project.id, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("deletes the owned project and its session", async () => {
    const { flow, projects, interviews, store } = workspace();
    const project = await projects.createProject({ ownerId: "user_a", spec });
    await interviews.createInterviewSession({
      ownerId: "user_a",
      projectId: project.id,
      session: createInterviewSession({ id: "sess-1" }),
    });

    const result = await flow.deleteProject(project.id);
    expect(result).toEqual({ ok: true });
    expect(store.projects.has(project.id)).toBe(false);
    expect(store.sessions.has("sess-1")).toBe(false);
  });

  it("hides another user's project on delete", async () => {
    const ownerA = workspace("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec,
    });

    const ownerB = createWorkspaceFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
      interviews: ownerA.interviews,
    });

    const result = await ownerB.deleteProject(project.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(ownerA.store.projects.has(project.id)).toBe(true);
  });
});
