import "server-only";
import JSZip from "jszip";
import { isRelativeSafePath } from "../../core/consistency/extraction";
import { GenerationError, GenerationErrorCode } from "../../core/generation/errors";
import type { GenerationResult } from "../../core/generation/types";

const ZIP_ROOT = "vrompt-export";

export function zipDownloadName(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `vrompt-${slug || "export"}.zip`;
}

export function parseExportTargets(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !item.includes("/") && !item.includes("\\"));
}

export function zipContentDisposition(filename: string): string {
  const safe = /^vrompt-[a-z0-9-]+\.zip$/.test(filename)
    ? filename
    : "vrompt-export.zip";
  return `attachment; filename="${safe}"`;
}

export function zipEntryPath(target: string, filePath: string): string {
  if (!isRelativeSafePath(filePath) || filePath.trim().length === 0) {
    throw invalidPath(filePath);
  }

  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized
    .split("/")
    .flatMap((part) => decodePathSegment(part).split(/[/\\]/));

  if (
    parts.length === 0 ||
    parts.some((part) => part.length === 0 || part === ".." || part === ".")
  ) {
    throw invalidPath(filePath);
  }

  const resolved = [ZIP_ROOT, target, ...parts];
  if (resolved[0] !== ZIP_ROOT || resolved[1] !== target) {
    throw invalidPath(filePath);
  }

  return resolved.join("/");
}

function decodePathSegment(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function invalidPath(filePath: string): GenerationError {
  return new GenerationError(
    GenerationErrorCode.EXPORT_INVALID_PATH,
    `Generated path "${filePath}" is not allowed in the archive.`,
  );
}

export async function createGenerationZip(
  result: GenerationResult,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const seen = new Set<string>();
  const entries: { path: string; content: string }[] = [];

  for (const target of result.targets) {
    for (const file of target.files) {
      const path = zipEntryPath(target.target, file.path);
      if (seen.has(path)) {
        throw new GenerationError(
          GenerationErrorCode.EXPORT_INVALID_PATH,
          `Duplicate archive path "${path}".`,
        );
      }

      seen.add(path);
      entries.push({ path, content: file.content });
    }
  }

  for (const file of result.docFiles ?? []) {
    const path = zipEntryPath("docs", file.path);
    if (seen.has(path)) {
      throw new GenerationError(
        GenerationErrorCode.EXPORT_INVALID_PATH,
        `Duplicate archive path "${path}".`,
      );
    }

    seen.add(path);
    entries.push({ path, content: file.content });
  }

  for (const file of result.jobFiles ?? []) {
    const path = zipEntryPath("jobs", file.path);
    if (seen.has(path)) {
      throw new GenerationError(
        GenerationErrorCode.EXPORT_INVALID_PATH,
        `Duplicate archive path "${path}".`,
      );
    }

    seen.add(path);
    entries.push({ path, content: file.content });
  }

  entries.sort((left, right) => left.path.localeCompare(right.path));

  try {
    for (const entry of entries) {
      zip.file(entry.path, entry.content);
    }

    const buffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });
    return buffer;
  } catch (error) {
    if (error instanceof GenerationError) {
      throw error;
    }

    throw new GenerationError(
      GenerationErrorCode.EXPORT_FAILED,
      "The export archive could not be created.",
    );
  }
}
