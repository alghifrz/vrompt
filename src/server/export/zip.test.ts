import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { generateForTargets } from "../../core/generation/generate";
import { GenerationError, GenerationErrorCode } from "../../core/generation/errors";
import type { ProjectSpec } from "../../core/schema/project-spec";
import {
  createGenerationZip,
  parseExportTargets,
  zipContentDisposition,
  zipDownloadName,
  zipEntryPath,
} from "./zip";

const readySpec: ProjectSpec = {
  project: {
    name: "FieldKit Pro",
    description: "A field toolkit.",
    problem: "Visit notes are scattered.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "ready",
  },
};

describe("generation ZIP", () => {
  it("uses a safe download filename", () => {
    expect(zipDownloadName("FieldKit Pro")).toBe("vrompt-fieldkit-pro.zip");
    expect(zipDownloadName("../secret")).toBe("vrompt-secret.zip");
    expect(zipDownloadName("///")).toBe("vrompt-export.zip");
  });

  it("rejects absolute and traversal paths", () => {
    const blocked = [
      "/etc/passwd",
      "/absolute/path",
      "../escape.md",
      "../../secret",
      "../../../etc/passwd",
      "C:\\secret",
      "C:\\Windows\\x",
      "%2e%2e/secret.md",
      "foo/%2e%2e/secret.md",
      "foo/./bar.md",
      "",
      "   ",
    ];

    for (const path of blocked) {
      expect(() => zipEntryPath("cursor", path)).toThrow(GenerationError);
    }
  });

  it("parses export targets without path separators", () => {
    expect(parseExportTargets("cursor,agents-md")).toEqual([
      "cursor",
      "agents-md",
    ]);
    expect(parseExportTargets("../secret,cursor")).toEqual(["cursor"]);
    expect(parseExportTargets("C:\\secret")).toEqual([]);
    expect(parseExportTargets(null)).toEqual([]);
  });

  it("keeps ZIP content-disposition filenames inside the vrompt prefix", () => {
    expect(zipContentDisposition("vrompt-fieldkit.zip")).toBe(
      'attachment; filename="vrompt-fieldkit.zip"',
    );
    expect(zipContentDisposition("../secret.zip")).toBe(
      'attachment; filename="vrompt-export.zip"',
    );
  });

  it("keeps a single target under its own namespace", async () => {
    const result = generateForTargets(readySpec, ["cursor"]);
    const bytes = await createGenerationZip(result);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);

    expect(names.every((name) => name.startsWith("vrompt-export/cursor/"))).toBe(
      true,
    );
    expect(names.some((name) => name.includes(".cursor/rules/"))).toBe(true);
  });

  it("keeps multiple targets in separate folders", async () => {
    const result = generateForTargets(readySpec, ["agents-md", "claude-code"]);
    const bytes = await createGenerationZip(result);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);

    expect(names.some((name) => name === "vrompt-export/agents-md/AGENTS.md")).toBe(
      true,
    );
    expect(names.some((name) => name.startsWith("vrompt-export/claude-code/"))).toBe(
      true,
    );
    expect(names.some((name) => name.startsWith("vrompt-export/cursor/"))).toBe(
      false,
    );
  });

  it("matches generated file contents", async () => {
    const result = generateForTargets(readySpec, ["agents-md"]);
    const bytes = await createGenerationZip(result);
    const zip = await JSZip.loadAsync(bytes);
    const content = await zip.file("vrompt-export/agents-md/AGENTS.md")?.async("string");

    expect(content).toBe(result.targets[0]?.files[0]?.content);
  });

  it("rejects duplicate archive paths", async () => {
    await expect(
      createGenerationZip({
        specId: "proj-1",
        generatedAt: "2026-01-01T00:00:00.000Z",
        diagnostics: [],
        targets: [
          {
            target: "cursor",
            files: [
              { path: ".cursor/rules/a.mdc", content: "one" },
              { path: ".cursor/rules/a.mdc", content: "two" },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: GenerationErrorCode.EXPORT_INVALID_PATH,
    });
  });

  it("orders archive entries deterministically", async () => {
    const result = generateForTargets(readySpec, ["claude-code", "agents-md"]);
    const first = await createGenerationZip(result);
    const second = await createGenerationZip(result);
    const names = (bytes: Uint8Array) =>
      JSZip.loadAsync(bytes).then((zip) =>
        Object.keys(zip.files)
          .filter((name) => !zip.files[name]?.dir)
          .sort(),
      );

    expect(await names(first)).toEqual(await names(second));
  });
});
