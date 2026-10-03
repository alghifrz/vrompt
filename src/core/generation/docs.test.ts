import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import { buildErdView, buildPrdView, renderDocFiles, renderErd, renderPrd } from "./docs";

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
  database: {
    entities: [
      { id: "entity-visit", name: "Visit", description: "A scheduled visit." },
      { id: "entity-note", name: "Note", description: "A visit note." },
    ],
    relationships: [
      {
        from: "Visit",
        to: "Note",
        type: "one-to-many",
        description: "A visit can have many notes.",
      },
    ],
  },
};

describe("generation docs", () => {
  it("writes a PRD from the spec", () => {
    const prd = renderPrd(spec);

    expect(prd).toContain("# Product Requirements Document");
    expect(prd).toContain("FieldKit");
    expect(prd).toContain("Visit notes are scattered.");
    expect(prd).toContain("Visit board");
    expect(prd).toContain("The board lists today's visits.");
    expect(prd).toContain("## 1. Document control");
    expect(prd).toContain("### 7.1 Feature catalog");
    expect(prd).toContain("| Feature");
    expect(prd).toContain("| Priority");
    expect(prd).toContain("## 5. Personas");
    expect(prd).toContain("Dispatcher");
    expect(prd).toContain("**User story**");
    expect(prd).toContain("flowchart TD");
    expect(prd).toContain("flowchart LR");
    expect(prd).toContain("Assign visits without conflicts.");
  });

  it("writes an ERD with a mermaid diagram", () => {
    const erd = renderErd(spec);

    expect(erd).toContain("# Entity Relationship Diagram");
    expect(erd).toContain("```mermaid");
    expect(erd).toContain("erDiagram");
    expect(erd).toContain("Visit");
    expect(erd).toContain("Note");
    expect(erd).toContain("||--o{");
    expect(erd).toContain("visitId");
    expect(erd).toContain("| Attribute");
    expect(erd).toContain("| Notes");
    expect(erd).toContain("References Visit.id");
    expect(erd).toContain("| Parent");
    expect(erd).toContain("| Cardinality");
    expect(erd).toContain("## 2. Entity catalog");
    expect(erd).toContain("## 3. Relationships");
  });

  it("builds visual views from the spec", () => {
    const prd = buildPrdView(spec);
    const erd = buildErdView(spec);

    expect(prd.users[0]?.name).toBe("Dispatcher");
    expect(prd.features[0]?.acceptance).toContain("The board lists today's visits.");
    expect(erd.inferred).toBe(false);
    expect(erd.entities.map((entity) => entity.name)).toEqual(["Visit", "Note"]);
    expect(erd.links[0]?.kind).toBe("one-to-many");
    expect(erd.entities[1]?.fields.some((item) => item.name === "visitId" && item.key === "FK")).toBe(
      true,
    );
    expect(
      erd.entities[1]?.fields.find((item) => item.name === "visitId")?.notes,
    ).toContain("References Visit.id");
  });

  it("infers an ERD when no database is specified", () => {
    const erd = buildErdView({
      ...spec,
      database: undefined,
    });

    expect(erd.inferred).toBe(true);
    expect(erd.entities.some((entity) => entity.name === "Dispatcher")).toBe(true);
    expect(erd.entities.some((entity) => entity.name === "Visit")).toBe(true);
    expect(erd.entities.some((entity) => entity.name === "Item")).toBe(false);
    expect(erd.links.length).toBeGreaterThan(0);
  });

  it("rebuilds an attendance model instead of Item and /api/items", () => {
    const absensi: ProjectSpec = {
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
      goals: {
        primary: [
          {
            id: "goal-1",
            statement:
              "Menyediakan sistem pencatatan kehadiran siswa yang cepat, akurat, dan bebas dari proses manual berulang.",
          },
        ],
        successCriteria: [
          "Guru dapat mengabsen satu kelas dalam satu layar tanpa menulis manual.",
        ],
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
          goals: ["Mencatat kehadiran siswa dengan cepat dan akurat tanpa proses manual berulang."],
          permissions: ["use-app"],
        },
      ],
      stack: {
        frontend: "Next.js",
        backend: "Next.js",
        database: "Postgres",
        authentication: "Clerk",
        hosting: "Vercel",
      },
      architecture: {
        style: "modular monolith",
        constraints: ["Keep TaskFlow as one app until a second surface is real."],
      },
      database: {
        entities: [{ id: "entity-1", name: "Item", description: "The main record a user creates." }],
        relationships: [
          { from: "Item", to: "AuthSession", type: "one-to-many", description: "has" },
        ],
      },
      api: {
        endpoints: [
          { method: "GET", path: "/api/items", purpose: "List the main records", authRequired: true },
          { method: "POST", path: "/api/items", purpose: "Create a record", authRequired: true },
        ],
      },
    };

    const prd = renderPrd(absensi);
    const erd = renderErd(absensi);
    const view = buildErdView(absensi);

    expect(view.entities.map((entity) => entity.name)).toEqual(
      expect.arrayContaining(["Guru", "Siswa", "Kehadiran", "AuthSession"]),
    );
    expect(view.entities.some((entity) => entity.name === "Item")).toBe(false);
    expect(view.links.some((link) => link.from === "Item")).toBe(false);
    expect(view.links.some((link) => link.from === "Guru" && link.to === "AuthSession")).toBe(
      true,
    );
    expect(erd).toContain("Kehadiran");
    expect(erd).toMatch(/Daftar Kehadiran|Lihat daftar Kehadiran|List Kehadiran/);
    expect(prd).toContain("Sebagai Guru");
    expect(prd).toContain("supaya mencatat kehadiran siswa secara digital");
    expect(prd).not.toContain("As a user, I want mengabsen");
    expect(prd).not.toMatch(/GET\s+\| \/api\/items/);
    expect(prd).not.toContain("TaskFlow");
    expect(prd).toContain("/api/siswa");
    expect(prd).toContain("/api/kehadiran");
    expect(prd).toContain("Mengabsen Siswa");
  });

  it("builds a bookstore ERD from the product, not from one feature title", () => {
    const erd = buildErdView({
      project: {
        name: "Toko Buku",
        description: "Aplikasi web untuk pemilik toko buku.",
        problem: "Penjualan masih dicatat manual.",
        targetUsers: ["Pemilik toko buku"],
        type: "web application",
        status: "ready",
      },
      features: [
        {
          id: "feature-1",
          name: "Pembayaran via Rekening Tetap",
          description: "Bayar lewat rekening tetap.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
      users: [
        {
          id: "user-1",
          name: "Penjual Toko Buku",
          description: "Pemilik toko.",
          goals: ["Jualan"],
          permissions: ["use-app"],
        },
      ],
    });

    const names = erd.entities.map((entity) => entity.name);
    expect(names.some((name) => /buku|penjualan|pesanan|pembayaran|pelanggan|stok/i.test(name))).toBe(
      true,
    );
    expect(names).not.toContain("Pembayaran via Rekening Tetap");
    expect(erd.links.length).toBeGreaterThanOrEqual(2);
  });

  it("includes PRD.md and ERD.md", () => {
    const files = renderDocFiles(spec);

    expect(files.map((file) => file.path)).toEqual(["PRD.md", "ERD.md"]);
  });
});
