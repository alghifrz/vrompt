import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { createRequireAuth } from "../auth/require-auth";
import { AuthErrorCode } from "../persistence/errors";
import {
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createReviewFlow } from "./review-flow";

const spec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field toolkit.",
    problem: "Visit notes are scattered.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "draft",
  },
};

function review(userId: string | null = "user_a") {
  const store = createMemoryStore();
  const projects = createMemoryProjectRepository(store);
  const flow = createReviewFlow({
    requireAuth: createRequireAuth(async () => ({ userId })),
    projects,
  });

  return { store, projects, flow };
}

describe("review flow", () => {
  it("rejects an unauthenticated load", async () => {
    const { flow } = review(null);

    await expect(flow.load("proj-1")).rejects.toMatchObject({
      code: AuthErrorCode.UNAUTHENTICATED,
    });
  });

  it("lets the authenticated owner load a project", async () => {
    const { flow, projects } = review();
    const project = await projects.createProject({ ownerId: "user_a", spec });

    const result = await flow.load(project.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.projectId).toBe(project.id);
      expect(result.view.spec.project.name).toBe("FieldKit");
      expect(result.view).not.toHaveProperty("ownerId");
    }
  });

  it("hides a missing project", async () => {
    const { flow } = review();
    const result = await flow.load("missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).not.toContain("user_a");
    }
  });

  it("hides another user's project", async () => {
    const ownerA = review("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec,
    });

    const ownerB = createReviewFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
    });

    const result = await ownerB.load(project.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("rejects an invalid persisted spec without leaking internals", async () => {
    const { flow, store } = review();
    store.projects.set("proj-bad", {
      id: "proj-bad",
      ownerId: "user_a",
      name: "Broken",
      description: "Broken",
      spec: { project: { name: "" } } as unknown as ProjectSpec,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await flow.load("proj-bad");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(result.error.message).not.toContain("Zod");
      expect(JSON.stringify(result.error)).not.toContain("DATABASE_URL");
    }
  });

  it("persists a valid ProjectSpec and keeps status synchronized", async () => {
    const { flow, projects, store } = review();
    const project = await projects.createProject({ ownerId: "user_a", spec });

    const next: ProjectSpec = {
      ...spec,
      project: { ...spec.project, name: "FieldKit Pro", status: "ready" },
    };

    const result = await flow.save({ projectId: project.id, spec: next });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.spec.project.name).toBe("FieldKit Pro");
      expect(result.view.isReady).toBe(true);
    }

    const stored = store.projects.get(project.id);
    expect(stored?.status).toBe("ready");
    expect(stored?.spec.project.status).toBe("ready");
    expect(stored?.name).toBe("FieldKit Pro");
  });

  it("does not persist an invalid ProjectSpec", async () => {
    const { flow, projects, store } = review();
    const project = await projects.createProject({ ownerId: "user_a", spec });

    const result = await flow.save({
      projectId: project.id,
      spec: {
        ...spec,
        project: { ...spec.project, name: "" },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(result.error.fields?.some((field) => field.path === "project.name")).toBe(
        true,
      );
    }

    expect(store.projects.get(project.id)?.spec.project.name).toBe("FieldKit");
  });

  it("does not let another user save an owned project", async () => {
    const ownerA = review("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec,
    });

    const ownerB = createReviewFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
    });

    const result = await ownerB.save({
      projectId: project.id,
      spec: {
        ...spec,
        project: { ...spec.project, name: "Hijacked" },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(ownerA.store.projects.get(project.id)?.spec.project.name).toBe(
      "FieldKit",
    );
  });

  it("ignores a client-supplied owner id as authority", async () => {
    const { flow, projects, store } = review();
    const project = await projects.createProject({ ownerId: "user_a", spec });

    const result = await flow.save({
      projectId: project.id,
      spec: {
        ...spec,
        project: { ...spec.project, name: "Still owned" },
        ownerId: "attacker",
      },
    });

    expect(result.ok).toBe(true);
    expect(store.projects.get(project.id)?.ownerId).toBe("user_a");
    expect(JSON.stringify(store.projects.get(project.id)?.spec)).not.toContain(
      "attacker",
    );
  });
});
