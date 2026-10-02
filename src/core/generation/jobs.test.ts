import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import { buildGenerationJobs, buildJobPack } from "./jobs";

const spec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field toolkit.",
    problem: "Visit notes are scattered.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "ready",
  },
  goals: {
    primary: [{ id: "goal-1", statement: "Assign visits without conflicts." }],
    successCriteria: ["A dispatcher can assign a visit quickly."],
  },
  features: [
    {
      id: "feature-board",
      name: "Visit board",
      description: "Show today's visits.",
      priority: "must",
      status: "planned",
      acceptanceCriteria: ["The board lists today's visits."],
    },
  ],
  users: [
    {
      id: "user-dispatcher",
      name: "Dispatcher",
      description: "Coordinates schedules.",
      goals: ["Assign visits"],
      permissions: ["manage-visits"],
    },
  ],
  stack: {
    frontend: "Next.js",
    database: "Postgres",
    authentication: "Clerk",
  },
};

describe("generation jobs", () => {
  it("breaks a spec into paste-ready jobs in a stable order", () => {
    const jobs = buildGenerationJobs(spec);

    expect(jobs.map((job) => job.title)).toEqual([
      "Bootstrap the repo",
      "Lay the foundation",
      "Visit board",
      "Fit the product to its users",
      "Wrap up the first version",
    ]);
    expect(jobs[0]?.step).toBe(1);
    expect(jobs[2]?.prompt).toContain("Visit board");
    expect(jobs[2]?.prompt).toContain("The board lists today's visits.");
    expect(jobs[2]?.prompt).toContain("Do not invent features");
  });

  it("falls back to the main outcome when there are no features", () => {
    const jobs = buildGenerationJobs({
      ...spec,
      features: undefined,
      stack: undefined,
      users: undefined,
    });

    expect(jobs.map((job) => job.title)).toEqual([
      "Bootstrap the repo",
      "Deliver the first outcome",
      "Wrap up the first version",
    ]);
    expect(jobs[1]?.prompt).toContain("Assign visits without conflicts.");
  });

  it("writes job files for the ZIP", () => {
    const pack = buildJobPack(spec);

    expect(pack.files[0]?.path).toBe("README.md");
    expect(pack.files[0]?.content).toContain("AI jobs for FieldKit");
    expect(pack.files.some((file) => file.path === "03-visit-board.md")).toBe(
      true,
    );
  });
});
