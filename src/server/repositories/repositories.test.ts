import { describe, expect, it } from "vitest";
import { createInterviewSession } from "../../core/interview/engine";
import type { InterviewSession } from "../../core/interview/types";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { createInterviewService } from "../application/interview-service";
import { createProjectService } from "../application/project-service";
import { createRequireAuth } from "../auth/require-auth";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "./memory";

const ownerA = "user_a";
const ownerB = "user_b";

const spec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field-service toolkit.",
    problem: "Visit details live in separate tools.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "draft",
  },
};

const readySpec: ProjectSpec = {
  project: {
    ...spec.project,
    name: "FieldKit Pro",
    status: "ready",
  },
};

function sessionFor(id: string, overrides: Partial<InterviewSession> = {}): InterviewSession {
  return {
    ...createInterviewSession({ id }),
    spec,
    ...overrides,
  };
}

function repositories() {
  const store = createMemoryStore();
  const clock = {
    now: () => new Date("2026-10-02T03:00:00.000Z"),
  };
  const ids = {
    next: () => "proj-generated",
  };

  return {
    store,
    projects: createMemoryProjectRepository(store, { clock, ids }),
    interviews: createMemoryInterviewRepository(store, { clock }),
  };
}

describe("project repository", () => {
  it("creates and retrieves an owned project", async () => {
    const { projects } = repositories();
    const created = await projects.createProject({
      ownerId: ownerA,
      spec,
      id: "proj-1",
    });

    expect(created.id).toBe("proj-1");
    expect(created.ownerId).toBe(ownerA);
    expect(created.name).toBe("FieldKit");
    expect(created.status).toBe("draft");
    expect(created.spec).toEqual(spec);

    const loaded = await projects.getProject({
      projectId: "proj-1",
      ownerId: ownerA,
    });
    expect(loaded?.spec).toEqual(spec);
  });

  it("lists only the owner's projects", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "a1" });
    await projects.createProject({ ownerId: ownerB, spec, id: "b1" });

    const listed = await projects.listProjects({ ownerId: ownerA });
    expect(listed.map((item) => item.id)).toEqual(["a1"]);
  });

  it("updates an owned project and keeps status in sync with the spec", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    const updated = await projects.updateProject({
      projectId: "proj-1",
      ownerId: ownerA,
      spec: readySpec,
    });

    expect(updated.name).toBe("FieldKit Pro");
    expect(updated.status).toBe("ready");
    expect(updated.spec.project.status).toBe("ready");
  });

  it("deletes an owned project", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await projects.deleteProject({ projectId: "proj-1", ownerId: ownerA });

    expect(
      await projects.getProject({ projectId: "proj-1", ownerId: ownerA }),
    ).toBeNull();
  });

  it("does not retrieve another user's project", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    expect(
      await projects.getProject({ projectId: "proj-1", ownerId: ownerB }),
    ).toBeNull();
  });

  it("does not update another user's project", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    await expect(
      projects.updateProject({
        projectId: "proj-1",
        ownerId: ownerB,
        spec: readySpec,
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.NOT_FOUND });
  });

  it("does not delete another user's project", async () => {
    const { projects } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    await expect(
      projects.deleteProject({ projectId: "proj-1", ownerId: ownerB }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.NOT_FOUND });

    expect(
      await projects.getProject({ projectId: "proj-1", ownerId: ownerA }),
    ).not.toBeNull();
  });

  it("rejects an invalid ProjectSpec", async () => {
    const { projects } = repositories();

    await expect(
      projects.createProject({
        ownerId: ownerA,
        spec: { project: { name: "" } } as unknown as ProjectSpec,
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.VALIDATION_FAILED });
  });

  it("requires an owner id", async () => {
    const { projects } = repositories();

    await expect(
      projects.createProject({ ownerId: "  ", spec }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });
});

describe("interview repository", () => {
  it("creates and retrieves a session for an owned project", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    const session = sessionFor("sess-1");

    const created = await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session,
    });

    expect(created.id).toBe("sess-1");
    expect(created.session).toEqual(session);

    const loaded = await interviews.getInterviewSession({
      sessionId: "sess-1",
      ownerId: ownerA,
    });
    expect(loaded?.session).toEqual(session);
  });

  it("updates a session without changing its id", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session: sessionFor("sess-1"),
    });

    const next = sessionFor("sess-1", {
      phase: "goals",
      questionSeq: 2,
      messages: [{ role: "user", content: "Field toolkit." }],
    });
    const updated = await interviews.updateInterviewSession({
      sessionId: "sess-1",
      ownerId: ownerA,
      session: next,
    });

    expect(updated.session.phase).toBe("goals");
    expect(updated.session.messages).toHaveLength(1);
  });

  it("deletes an owned session", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session: sessionFor("sess-1"),
    });
    await interviews.deleteInterviewSession({
      sessionId: "sess-1",
      ownerId: ownerA,
    });

    expect(
      await interviews.getInterviewSession({
        sessionId: "sess-1",
        ownerId: ownerA,
      }),
    ).toBeNull();
  });

  it("rejects an invalid interview session", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    await expect(
      interviews.createInterviewSession({
        ownerId: ownerA,
        projectId: "proj-1",
        session: { ...sessionFor("sess-1"), id: "   " },
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.VALIDATION_FAILED });
  });

  it("rejects an invalid session ProjectSpec", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    await expect(
      interviews.createInterviewSession({
        ownerId: ownerA,
        projectId: "proj-1",
        session: {
          ...sessionFor("sess-1"),
          spec: { project: { name: "x" } } as unknown as ProjectSpec,
        },
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.VALIDATION_FAILED });
  });

  it("rejects an invalid phase", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });

    await expect(
      interviews.createInterviewSession({
        ownerId: ownerA,
        projectId: "proj-1",
        session: {
          ...sessionFor("sess-1"),
          phase: "skip-to-security" as InterviewSession["phase"],
        },
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.VALIDATION_FAILED });
  });

  it("does not allow a second session for the same project", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session: sessionFor("sess-1"),
    });

    await expect(
      interviews.createInterviewSession({
        ownerId: ownerA,
        projectId: "proj-1",
        session: sessionFor("sess-2"),
      }),
    ).rejects.toMatchObject({ code: PersistenceErrorCode.CONFLICT });
  });

  it("does not expose another user's session", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session: sessionFor("sess-1"),
    });

    expect(
      await interviews.getInterviewSession({
        sessionId: "sess-1",
        ownerId: ownerB,
      }),
    ).toBeNull();
  });

  it("cascades session deletion when the project is deleted", async () => {
    const { projects, interviews } = repositories();
    await projects.createProject({ ownerId: ownerA, spec, id: "proj-1" });
    await interviews.createInterviewSession({
      ownerId: ownerA,
      projectId: "proj-1",
      session: sessionFor("sess-1"),
    });
    await projects.deleteProject({ projectId: "proj-1", ownerId: ownerA });

    expect(
      await interviews.getInterviewSession({
        sessionId: "sess-1",
        ownerId: ownerA,
      }),
    ).toBeNull();
  });
});

describe("authenticated application services", () => {
  it("requires identity before creating a project", async () => {
    const { projects } = repositories();
    const service = createProjectService(
      createRequireAuth(async () => ({ userId: null })),
      projects,
    );

    await expect(service.create(spec)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("creates, lists, updates, and deletes through the authenticated owner", async () => {
    const { projects } = repositories();
    const service = createProjectService(
      createRequireAuth(async () => ({ userId: ownerA })),
      projects,
    );

    const created = await service.create(spec, "proj-1");
    expect(created.ownerId).toBe(ownerA);
    expect((await service.list()).map((item) => item.id)).toEqual(["proj-1"]);

    const updated = await service.update("proj-1", readySpec);
    expect(updated.status).toBe("ready");

    await service.delete("proj-1");
    expect(await service.get("proj-1")).toBeNull();
  });

  it("cannot let user B access user A's project through the service", async () => {
    const { projects } = repositories();
    const userA = createProjectService(
      createRequireAuth(async () => ({ userId: ownerA })),
      projects,
    );
    const userB = createProjectService(
      createRequireAuth(async () => ({ userId: ownerB })),
      projects,
    );

    await userA.create(spec, "proj-1");
    expect(await userB.get("proj-1")).toBeNull();
    await expect(userB.update("proj-1", readySpec)).rejects.toMatchObject({
      code: PersistenceErrorCode.NOT_FOUND,
    });
    await expect(userB.delete("proj-1")).rejects.toMatchObject({
      code: PersistenceErrorCode.NOT_FOUND,
    });
  });

  it("persists interview sessions through the authenticated owner", async () => {
    const { projects, interviews } = repositories();
    const projectService = createProjectService(
      createRequireAuth(async () => ({ userId: ownerA })),
      projects,
    );
    const interviewService = createInterviewService(
      createRequireAuth(async () => ({ userId: ownerA })),
      interviews,
    );

    await projectService.create(spec, "proj-1");
    const created = await interviewService.create("proj-1", sessionFor("sess-1"));
    expect(created.session.id).toBe("sess-1");

    const updated = await interviewService.update(
      "sess-1",
      sessionFor("sess-1", { phase: "features", questionSeq: 3 }),
    );
    expect(updated.session.phase).toBe("features");

    await interviewService.delete("sess-1");
    expect(await interviewService.get("sess-1")).toBeNull();
  });
});
