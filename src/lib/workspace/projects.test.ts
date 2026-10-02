import { describe, expect, it } from "vitest";
import { parseWorkspaceProjectName, toWorkspaceProject } from "./projects";

describe("workspace projects", () => {
  it("uses a display name and never includes owner id", () => {
    const project = toWorkspaceProject({
      id: "proj-1",
      name: "Untitled project",
      status: "draft",
    });

    expect(project).toEqual({
      id: "proj-1",
      name: "New project",
      status: "draft",
      stage: "interview",
      href: "/interview/proj-1",
    });
    expect(project).not.toHaveProperty("ownerId");
  });

  it("parses a trimmed project name", () => {
    expect(parseWorkspaceProjectName("  Field Kit  ")).toEqual({
      ok: true,
      name: "Field Kit",
    });
    expect(parseWorkspaceProjectName("   ")).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(parseWorkspaceProjectName("x".repeat(81))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("sends a ready project to generate", () => {
    expect(
      toWorkspaceProject({
        id: "proj-2",
        name: "FieldKit",
        status: "ready",
      }),
    ).toMatchObject({
      stage: "generate",
      href: "/generate/proj-2",
    });
  });
});
