import { describe, expect, it } from "vitest";
import { ProjectSpecSchema, type ProjectSpec } from "../../core/schema/project-spec";
import {
  fieldError,
  moveItem,
  nextReviewId,
  parseReviewSpec,
  specsDiffer,
  toReviewViewModel,
} from "./view-model";

const minimalSpec: ProjectSpec = {
  project: {
    name: "Notebook",
    description: "A personal notebook.",
    problem: "Notes are scattered.",
    targetUsers: ["Writers"],
    type: "web application",
    status: "draft",
  },
};

describe("review view model", () => {
  it("maps a valid ProjectSpec without inventing optional sections", () => {
    const view = toReviewViewModel({
      projectId: "proj-1",
      spec: minimalSpec,
    });

    expect(view.projectId).toBe("proj-1");
    expect(view.spec).toEqual(minimalSpec);
    expect(view.spec.goals).toBeUndefined();
    expect(view.spec.database).toBeUndefined();
    expect(view.spec.aiRules).toBeUndefined();
    expect(view.isReady).toBe(false);
    expect(view.status).toBe("draft");
    expect(view.canEdit).toBe(true);
  });

  it("marks a ready specification as ready", () => {
    const view = toReviewViewModel({
      projectId: "proj-1",
      spec: {
        ...minimalSpec,
        project: { ...minimalSpec.project, status: "ready" },
      },
    });

    expect(view.isReady).toBe(true);
    expect(view.status).toBe("ready");
  });

  it("does not leak owner identity or server metadata", () => {
    const view = toReviewViewModel({
      projectId: "proj-1",
      spec: minimalSpec,
    });

    expect(view).not.toHaveProperty("ownerId");
    expect(view).not.toHaveProperty("createdAt");
    expect(JSON.stringify(view)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(view)).not.toContain("CLERK_SECRET_KEY");
  });

  it("surfaces a required project name from canonical validation", () => {
    const parsed = parseReviewSpec({
      project: { ...minimalSpec.project, name: "" },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(fieldError(parsed.fields, "project.name")).toBe(
      "Project name is required.",
    );
  });

  it("surfaces API path and scoped glob messages from the canonical schema", () => {
    const parsed = parseReviewSpec({
      ...minimalSpec,
      api: {
        endpoints: [
          {
            method: "GET",
            path: "visits",
            purpose: "List visits.",
            authRequired: true,
          },
        ],
      },
      aiRules: [
        {
          id: "rule-1",
          title: "Scoped rule",
          priority: "must",
          activationMode: "scoped",
          globs: [],
          body: "Keep handlers thin.",
          rationale: "Transport stays out of domain code.",
        },
      ],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(fieldError(parsed.fields, "api.endpoints.0.path")).toBe(
      'API path must start with "/".',
    );
    expect(
      parsed.fields.some((error) =>
        error.message === "Scoped AI rules require at least one glob.",
      ),
    ).toBe(true);
  });

  it("reports duplicate feature IDs from the canonical schema", () => {
    const parsed = parseReviewSpec({
      ...minimalSpec,
      features: [
        {
          id: "feature-1",
          name: "Board",
          description: "Visit board",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
        {
          id: "feature-1",
          name: "Notes",
          description: "Offline notes",
          priority: "should",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(parsed.fields.some((error) => error.message === "Feature IDs must be unique.")).toBe(
      true,
    );
  });

  it("creates item IDs only when asked, not as render leftovers", () => {
    const first = nextReviewId("feature");
    const second = nextReviewId("feature");

    expect(first.startsWith("feature-")).toBe(true);
    expect(second.startsWith("feature-")).toBe(true);
    expect(first).not.toBe(second);
  });

  it("detects unsaved spec differences and reorders items", () => {
    const edited: ProjectSpec = {
      ...minimalSpec,
      project: { ...minimalSpec.project, name: "FieldKit" },
    };

    expect(specsDiffer(minimalSpec, edited)).toBe(true);
    expect(specsDiffer(minimalSpec, structuredClone(minimalSpec))).toBe(false);
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(ProjectSpecSchema.safeParse(minimalSpec).success).toBe(true);
  });
});
