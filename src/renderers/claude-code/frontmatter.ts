export function serializeYamlScalar(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");

  if (normalized.includes("\n")) {
    return `|\n${normalized
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}`;
  }

  return `"${normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function renderPathsFrontmatter(paths: readonly string[]): string {
  const lines = ["---", "paths:"];

  for (const path of paths) {
    lines.push(`  - ${serializeYamlScalar(path)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

export function renderClaudeRuleFile(
  body: string,
  paths?: readonly string[],
): string {
  if (paths && paths.length > 0) {
    return `${renderPathsFrontmatter(paths)}\n\n${body}\n`;
  }

  return `${body}\n`;
}
