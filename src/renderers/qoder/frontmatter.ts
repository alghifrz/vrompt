export type QoderTrigger = "always_on" | "manual" | "model_decision" | "glob";

export interface QoderFrontmatter {
  trigger: QoderTrigger;
  description?: string;
  glob?: readonly string[];
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

  if (UNQUOTED_SCALAR.test(normalized) && !YAML_RESERVED.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function renderQoderFrontmatter(frontmatter: QoderFrontmatter): string {
  const lines = ["---", `trigger: ${frontmatter.trigger}`];

  if (frontmatter.description) {
    lines.push(`description: ${serializeYamlScalar(frontmatter.description)}`);
  }

  if (frontmatter.glob && frontmatter.glob.length > 0) {
    lines.push("glob:");
    for (const pattern of frontmatter.glob) {
      lines.push(`  - ${serializeYamlScalar(pattern)}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

export function renderQoderRuleFile(
  frontmatter: QoderFrontmatter,
  body: string,
): string {
  return `${renderQoderFrontmatter(frontmatter)}\n\n${body}\n`;
}
