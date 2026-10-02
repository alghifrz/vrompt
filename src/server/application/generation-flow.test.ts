import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { createRequireAuth } from "../auth/require-auth";
import { AuthErrorCode } from "../persistence/errors";
import {
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createGenerationFlow } from "./generation-flow";

const readySpec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field toolkit.",
    problem: "Visit notes are scattered.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "ready",
  },
};

function flow(userId: string | null = "user_a") {
  const store = createMemoryStore();
  const projects = createMemoryProjectRepository(store);
  return {
    store,
    projects,
    flow: createGenerationFlow({
      requireAuth: createRequireAuth(async () => ({ userId })),
      projects,
    }),
  };
}

describe("generation flow", () => {
  it("requires authentication", async () => {
    const { flow: generation } = flow(null);

    await expect(generation.load("proj-1")).rejects.toMatchObject({
      code: AuthErrorCode.UNAUTHENTICATED,
    });
  });

  it("lets the owner generate from the persisted spec", async () => {
    const { flow: generation, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const result = await generation.generate({
      projectId: project.id,
      targets: ["agents-md"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.projectId).toBe(project.id);
      expect(result.view.targets[0]?.files[0]?.content).toContain("FieldKit");
      expect(result.view).not.toHaveProperty("ownerId");
      expect(result.view).not.toHaveProperty("spec");
    }
  });

  it("hides missing and foreign projects", async () => {
    const ownerA = flow("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const missing = await ownerA.flow.load("missing");
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("NOT_FOUND");
    }

    const ownerB = createGenerationFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
    });

    const foreign = await ownerB.generate({
      projectId: project.id,
      targets: ["cursor"],
    });
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) {
      expect(foreign.error.code).toBe("NOT_FOUND");
    }
  });

  it("ignores a client-supplied owner id", async () => {
    const { flow: generation, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const result = await generation.generate({
      projectId: project.id,
      targets: ["agents-md"],
      // @ts-expect-error ownership is never accepted from the client
      ownerId: "attacker",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects an invalid persisted spec", async () => {
    const { flow: generation, store } = flow();
    store.projects.set("proj-bad", {
      id: "proj-bad",
      ownerId: "user_a",
      name: "Broken",
      description: "Broken",
      spec: { project: { name: "Broken" } } as unknown as ProjectSpec,
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await generation.generate({
      projectId: "proj-bad",
      targets: ["cursor"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GENERATION_INVALID_SPEC");
      expect(result.error.message).not.toContain("Zod");
    }
  });

  it("rejects a project that is not ready", async () => {
    const { flow: generation, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: {
        ...readySpec,
        project: { ...readySpec.project, status: "draft" },
      },
    });

    const loaded = await generation.load(project.id);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.view.ready).toBe(false);
    }

    const generated = await generation.generate({
      projectId: project.id,
      targets: ["cursor"],
    });
    expect(generated.ok).toBe(false);
    if (!generated.ok) {
      expect(generated.error.code).toBe("GENERATION_NOT_READY");
    }
  });

  it("hides foreign ZIP exports as not found", async () => {
    const ownerA = flow("user_a");
    const project = await ownerA.projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const ownerB = createGenerationFlow({
      requireAuth: createRequireAuth(async () => ({ userId: "user_b" })),
      projects: ownerA.projects,
    });

    await expect(
      ownerB.exportZip({
        projectId: project.id,
        targets: ["agents-md"],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ignores a client-supplied ProjectSpec during export", async () => {
    const { flow: generation, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const exported = await generation.exportZip({
      projectId: project.id,
      targets: ["agents-md"],
      // @ts-expect-error export always reloads the persisted spec
      spec: {
        project: {
          ...readySpec.project,
          name: "Stolen",
        },
      },
    });

    expect(exported.filename).toBe("vrompt-fieldkit.zip");
    expect(exported.filename).not.toContain("stolen");
  });

  it("exports a ZIP from the persisted spec", async () => {
    const { flow: generation, projects } = flow();
    const project = await projects.createProject({
      ownerId: "user_a",
      spec: readySpec,
    });

    const exported = await generation.exportZip({
      projectId: project.id,
      targets: ["agents-md"],
    });

    expect(exported.filename).toBe("vrompt-fieldkit.zip");
    expect(exported.bytes.byteLength).toBeGreaterThan(20);
  });
});
