import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(import.meta.dirname, "..");
const FORBIDDEN = [
  /from\s+["']server-only["']/,
  /from\s+["'][^"']*\/server\/(?:db|repositories|runtime|auth|export)[^"']*["']/,
  /process\.env\.(?:DATABASE_URL|CLERK_SECRET_KEY|DASHSCOPE_API_KEY|LLM_API_KEY|OPENAI_API_KEY)/,
];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
}

describe("client / server import boundary", () => {
  it("keeps Client Components off server-only modules and secrets", async () => {
    const files = await walk(path.join(SRC_ROOT, "components"));
    const violations: string[] = [];

    for (const file of files) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        continue;
      }

      const source = await readFile(file, "utf8");
      if (!source.includes('"use client"')) {
        continue;
      }

      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) {
          violations.push(`${path.relative(SRC_ROOT, file)} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
