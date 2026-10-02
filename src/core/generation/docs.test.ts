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
    expect(erd.entities[1]?.fields.some((field) => field.name === "visitId")).toBe(true);
  });

  it("infers an ERD when no database is specified", () => {
    const erd = buildErdView({
      ...spec,
      database: undefined,
    });

    expect(erd.inferred).toBe(true);
    expect(erd.entities.some((entity) => entity.name === "Dispatcher")).toBe(true);
    expect(erd.entities.some((entity) => entity.name === "Visit Board")).toBe(true);
    expect(erd.links.length).toBeGreaterThan(0);
  });

  it("includes PRD.md and ERD.md", () => {
    const files = renderDocFiles(spec);

    expect(files.map((file) => file.path)).toEqual(["PRD.md", "ERD.md"]);
  });
});
