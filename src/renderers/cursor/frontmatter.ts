export interface CursorFrontmatter {
  description: string;
  alwaysApply: boolean;
  globs?: readonly string[];
}

const UNQUOTED_SCALAR = /^[A-Za-z][A-Za-z0-9 ._-]*$/;
const YAML_RESERVED = /^(true|false|null|yes|no|on|off|~)$/i;

export function serializeYamlScalar(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");

  if (normalized.includes("\n")) {
    return `|\n${normalized
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}`;
  }

  if (
    UNQUOTED_SCALAR.test(normalized) &&
    !YAML_RESERVED.test(normalized)
  ) {
    return normalized;
  }

  return `"${normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function renderFrontmatter(frontmatter: CursorFrontmatter): string {
  const lines = [
    "---",
    `description: ${serializeYamlScalar(frontmatter.description)}`,
  ];

  if (frontmatter.globs && frontmatter.globs.length > 0) {
    lines.push("globs:");
    for (const glob of frontmatter.globs) {
      lines.push(`  - ${serializeYamlScalar(glob)}`);
    }
  }

  lines.push(`alwaysApply: ${frontmatter.alwaysApply ? "true" : "false"}`);
  lines.push("---");
  return lines.join("\n");
}

export function renderCursorRuleFile(
  frontmatter: CursorFrontmatter,
  body: string,
): string {
  return `${renderFrontmatter(frontmatter)}\n\n${body}\n`;
}
