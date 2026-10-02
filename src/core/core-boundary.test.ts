import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CORE_ROOT = path.resolve(import.meta.dirname);
const FORBIDDEN = [
  /from\s+["']next(?:\/[^"']*)?["']/,
  /from\s+["']react(?:\/[^"']*)?["']/,
  /from\s+["']react-dom(?:\/[^"']*)?["']/,
  /from\s+["']@clerk(?:\/[^"']*)?["']/,
  /from\s+["']drizzle-orm(?:\/[^"']*)?["']/,
  /from\s+["']postgres["']/,
  /from\s+["']server-only["']/,
  /from\s+["']jszip["']/,
  /from\s+["']node:fs(?:\/promises)?["']/,
  /from\s+["']fs(?:\/promises)?["']/,
  /from\s+["']node:path["']/,
  /process\.env/,
  /window\./,
  /document\./,
  /localStorage/,
];

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(full)));
      continue;
    }

    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }

  return files;
}

describe("core dependency boundary", () => {
  it("does not import Next, React, Clerk, Drizzle, env, or filesystem APIs", async () => {
    const files = await sourceFiles(CORE_ROOT);
    expect(files.length).toBeGreaterThan(5);

    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) {
          violations.push(`${path.relative(CORE_ROOT, file)} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
