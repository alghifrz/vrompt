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
      "Wrap up the first version",
    ]);
    expect(jobs[0]?.step).toBe(1);
    expect(jobs[2]?.prompt).toContain("Visit board");
    expect(jobs[2]?.prompt).toContain("The board lists today's visits.");
    expect(jobs[2]?.prompt).toContain("Do not invent features");
    expect(jobs[2]?.prompt).toContain("Dispatcher");
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

  it("skips later features and extra roles when one user is enough", () => {
    const jobs = buildGenerationJobs({
      ...spec,
      features: [
        spec.features![0]!,
        {
          id: "feature-later",
          name: "Reports",
          description: "Weekly reports.",
          priority: "later",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(jobs.map((job) => job.title)).toEqual([
      "Bootstrap the repo",
      "Lay the foundation",
      "Visit board",
      "Wrap up the first version",
    ]);
    expect(jobs.some((job) => job.title === "Reports")).toBe(false);
    expect(jobs.some((job) => job.title === "Fit the product to its users")).toBe(
      false,
    );
  });

  it("adds a job per must feature and a users job when roles differ", () => {
    const jobs = buildGenerationJobs({
      ...spec,
      features: [
        spec.features![0]!,
        {
          id: "feature-notes",
          name: "Visit notes",
          description: "Write a note on a visit.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: ["A dispatcher can save a note."],
        },
      ],
      users: [
        spec.users![0]!,
        {
          id: "user-tech",
          name: "Technician",
          description: "Completes visits.",
          goals: ["Close visits"],
          permissions: ["write-notes"],
        },
      ],
    });

    expect(jobs.map((job) => job.title)).toEqual([
      "Bootstrap the repo",
      "Lay the foundation",
      "Visit board",
      "Visit notes",
      "Fit the product to its users",
      "Wrap up the first version",
    ]);
  });

  it("groups extra should-have features instead of padding to seven", () => {
    const extras = Array.from({ length: 8 }, (_, index) => ({
      id: `feature-extra-${String(index)}`,
      name: `Extra ${String(index + 1)}`,
      description: `Optional extra ${String(index + 1)}.`,
      priority: "should" as const,
      status: "planned" as const,
      acceptanceCriteria: [],
    }));
    const jobs = buildGenerationJobs({
      ...spec,
      users: undefined,
      features: [spec.features![0]!, ...extras],
    });

    expect(jobs.some((job) => job.title === "Visit board")).toBe(true);
    expect(jobs.some((job) => job.title === "Add the should-have features")).toBe(
      true,
    );
    expect(jobs.filter((job) => job.title.startsWith("Extra "))).toHaveLength(0);
    expect(jobs.length).toBeLessThan(8 + extras.length);
  });

  it("writes job files for the ZIP", () => {
    const pack = buildJobPack(spec);

    expect(pack.files[0]?.path).toBe("README.md");
    expect(pack.files[0]?.content).toContain("AI jobs for FieldKit");
    expect(pack.files[0]?.content).toContain("not a fixed count");
    expect(pack.files.some((file) => file.path === "03-visit-board.md")).toBe(
      true,
    );
  });

  it("writes beginner attendance jobs instead of generic Item prompts", () => {
    const jobs = buildGenerationJobs({
      ...spec,
      project: {
        name: "SmartAbsensi",
        description:
          "Aplikasi web yang membantu guru mencatat kehadiran siswa secara efisien tanpa proses manual setiap hari.",
        problem:
          "Pencatatan kehadiran siswa secara manual setiap hari menyita waktu dan berisiko tinggi terjadi kesalahan.",
        targetUsers: ["guru"],
        type: "web application",
        status: "ready",
      },
      features: [
        {
          id: "feature-absen",
          name: "Mengabsen Siswa",
          description:
            "Fitur untuk mencatat kehadiran siswa secara digital dengan cepat dan akurat.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
      users: [
        {
          id: "user-guru",
          name: "guru",
          description: "Guru bertugas mencatat kehadiran siswa di kelas setiap hari.",
          goals: ["Mencatat kehadiran siswa dengan cepat."],
          permissions: ["use-app"],
        },
      ],
      database: {
        entities: [{ id: "entity-1", name: "Item", description: "The main record." }],
      },
      api: {
        endpoints: [
          { method: "GET", path: "/api/items", purpose: "List", authRequired: true },
          { method: "POST", path: "/api/items", purpose: "Create", authRequired: true },
        ],
      },
    });

    const absen = jobs.find((job) => job.title === "Mengabsen Siswa");
    expect(absen?.prompt).toContain("hadir, izin, sakit");
    expect(absen?.prompt).toContain("Kehadiran");
    expect(absen?.prompt).toContain("Kerjakan berurutan");
    expect(absen?.prompt).toContain("Jangan membuat entitas Item atau /api/items");
    expect(jobs.find((job) => job.id === "job-foundation")?.prompt).toContain(
      "Guru, Siswa, Kehadiran",
    );
  });
});
