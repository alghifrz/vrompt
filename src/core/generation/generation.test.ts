import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import { GenerationError, GenerationErrorCode } from "./errors";
import { generateForTarget, generateForTargets, normalizeTargets } from "./generate";
import { GenerationRegistry, createDefaultGenerationRegistry } from "./registry";

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

const readyWithRules: ProjectSpec = {
  ...readySpec,
  aiRules: [
    {
      id: "rule-scoped",
      title: "Keep handlers thin",
      priority: "must",
      activationMode: "scoped",
      globs: ["src/app/**"],
      body: "Route handlers should call application services.",
      rationale: "Transport stays out of domain code.",
    },
  ],
};

function draftSpec(status: "draft" | "archived"): ProjectSpec {
  return {
    ...readySpec,
    project: { ...readySpec.project, status },
  };
}

describe("generation registry", () => {
  it("registers and resolves builtin targets", () => {
    const registry = createDefaultGenerationRegistry();

    expect(registry.has("cursor")).toBe(true);
    expect(registry.get("cursor")?.target).toBe("cursor");
    expect(registry.require("agents-md").target).toBe("agents-md");
    expect(registry.ids()).toEqual([
      "agents-md",
      "cursor",
      "qoder",
      "claude-code",
    ]);
  });

  it("rejects duplicate registration", () => {
    const registry = createDefaultGenerationRegistry();

    expect(() =>
      registry.register({
        target: "cursor",
        render: () => [],
      }),
    ).toThrow(GenerationError);
  });

  it("throws for an unknown required target", () => {
    const registry = createDefaultGenerationRegistry();

    try {
      registry.require("notepad");
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationError);
      expect((error as GenerationError).code).toBe(
        GenerationErrorCode.GENERATION_TARGET_UNSUPPORTED,
      );
    }
  });
});

describe("generation", () => {
  it("generates AGENTS.md for a ready spec", () => {
    const generated = generateForTarget(readySpec, "agents-md");

    expect(generated.target).toBe("agents-md");
    expect(generated.files[0]?.path).toBe("AGENTS.md");
    expect(generated.files[0]?.content).toContain("# Project");
    expect(generated.files[0]?.content).toContain("FieldKit");
  });

  it("generates Cursor files for a ready spec", () => {
    const generated = generateForTarget(readySpec, "cursor");

    expect(generated.files.some((file) => file.path.startsWith(".cursor/rules/"))).toBe(
      true,
    );
    expect(generated.files[0]?.content).toContain("FieldKit");
  });

  it("generates Qoder files for a ready spec", () => {
    const generated = generateForTarget(readySpec, "qoder");

    expect(generated.files.some((file) => file.path.startsWith(".qoder/rules/"))).toBe(
      true,
    );
  });

  it("generates Claude Code files for a ready spec", () => {
    const generated = generateForTarget(readySpec, "claude-code");

    expect(generated.files.some((file) => file.path === "CLAUDE.md")).toBe(true);
  });

  it("rejects an invalid spec", () => {
    expect(() =>
      generateForTargets({ project: { name: "" } }, ["cursor"]),
    ).toThrowError(/invalid/i);
  });

  it("rejects draft and archived specs", () => {
    expect(() => generateForTargets(draftSpec("draft"), ["cursor"])).toThrow(
      GenerationError,
    );
    expect(() => generateForTargets(draftSpec("archived"), ["agents-md"])).toThrow(
      GenerationError,
    );

    try {
      generateForTargets(draftSpec("draft"), ["cursor"]);
    } catch (error) {
      expect((error as GenerationError).code).toBe(
        GenerationErrorCode.GENERATION_NOT_READY,
      );
    }
  });

  it("generates a ready project", () => {
    const result = generateForTargets(readySpec, ["agents-md"], {
      specId: "proj-1",
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.specId).toBe("proj-1");
    expect(result.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.targets).toHaveLength(1);
  });

  it("rejects an unknown target", () => {
    try {
      generateForTargets(readySpec, ["windsurf"]);
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GenerationError).code).toBe(
        GenerationErrorCode.GENERATION_TARGET_UNSUPPORTED,
      );
    }
  });

  it("normalizes duplicate targets and selection order", () => {
    expect(normalizeTargets(["cursor", "agents-md", "cursor"])).toEqual([
      "agents-md",
      "cursor",
    ]);

    const first = generateForTargets(readySpec, ["cursor", "agents-md"]);
    const second = generateForTargets(readySpec, ["agents-md", "cursor"]);

    expect(first.targets.map((item) => item.target)).toEqual([
      "agents-md",
      "cursor",
    ]);
    expect(second.targets.map((item) => item.target)).toEqual(
      first.targets.map((item) => item.target),
    );
    expect(first.targets.map((item) => item.files)).toEqual(
      second.targets.map((item) => item.files),
    );
  });

  it("keeps file order and contents deterministic", () => {
    const first = generateForTarget(readySpec, "cursor");
    const second = generateForTarget(readySpec, "cursor");

    expect(first.files.map((file) => file.path)).toEqual(
      second.files.map((file) => file.path),
    );
    expect(first.files.map((file) => file.content)).toEqual(
      second.files.map((file) => file.content),
    );
    expect(JSON.stringify(first.files)).not.toContain("2026-01-01");
  });

  it("does not inject generatedAt into file contents", () => {
    const result = generateForTargets(readySpec, ["agents-md"], {
      now: () => new Date("2026-10-02T00:00:00.000Z"),
    });

    expect(result.generatedAt).toBe("2026-10-02T00:00:00.000Z");
    expect(result.targets[0]?.files[0]?.content).not.toContain(
      "2026-10-02T00:00:00.000Z",
    );
  });

  it("passes output integrity and keeps target limitations as non-fatal", () => {
    const result = generateForTargets(readyWithRules, [
      "agents-md",
      "cursor",
    ]);

    expect(result.diagnostics.some((item) => item.severity === "error")).toBe(
      false,
    );
    expect(
      result.diagnostics.some((item) => item.code === "TARGET_LIMITATION"),
    ).toBe(true);
  });

  it("rejects inconsistent renderer output", () => {
    const registry = new GenerationRegistry();
    registry.register({
      target: "cursor",
      render: () => [{ path: ".cursor/rules/empty.mdc", content: "" }],
    });

    try {
      generateForTargets(readySpec, ["cursor"], { registry });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationError);
      expect((error as GenerationError).code).toBe(
        GenerationErrorCode.GENERATION_INCONSISTENT,
      );
    }
  });
});
