export interface RenderedFile {
  path: string;
  content: string;
}

export function combinedContent(files: readonly RenderedFile[]): string {
  return files.map((file) => file.content).join("\n");
}

export function containsLiteral(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.includes(needle);
}

export function countLiteral(haystack: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }

  let count = 0;
  let from = 0;

  while (from <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    count += 1;
    from = index + needle.length;
  }

  return count;
}

export function firstIndex(haystack: string, needle: string): number {
  return needle.length === 0 ? -1 : haystack.indexOf(needle);
}

export function isRelativeSafePath(path: string): boolean {
  if (path.trim().length === 0) {
    return false;
  }

  if (path.startsWith("/") || path.startsWith("\\")) {
    return false;
  }

  if (/^[A-Za-z]:[\\/]/.test(path)) {
    return false;
  }

  return !path.split(/[/\\]/).some((part) => part === "..");
}

export function accidentalTokenPresent(
  content: string,
  token: "undefined" | "null" | "[object Object]",
): boolean {
  if (token === "[object Object]") {
    return content.includes(token);
  }

  const pattern =
    token === "undefined"
      ? /(^|[^A-Za-z_])undefined([^A-Za-z_]|$)/
      : /(^|[^A-Za-z_])null([^A-Za-z_]|$)/;
  return pattern.test(content);
}

export function ruleMarker(id: string): string {
  return `**ID:** ${id}`;
}

export function extractRuleRegion(
  files: readonly RenderedFile[],
  ruleId: string,
  allRuleIds: readonly string[],
): { path?: string; content: string } | undefined {
  const marker = ruleMarker(ruleId);
  const matchingFiles = files.filter((file) => file.content.includes(marker));

  if (matchingFiles.length === 0) {
    const fallback = files.filter((file) => file.content.includes(ruleId));
    if (fallback.length === 0) {
      return undefined;
    }

    return {
      path: fallback[0]?.path,
      content: fallback.map((file) => file.content).join("\n"),
    };
  }

  const otherMarkers = allRuleIds
    .filter((id) => id !== ruleId)
    .map((id) => ruleMarker(id));

  const regions = matchingFiles.map((file) => {
    const hasSiblingRules = otherMarkers.some((other) =>
      file.content.includes(other),
    );

    if (!hasSiblingRules) {
      return {
        path: file.path,
        content: file.content,
      };
    }

    const idIndex = file.content.indexOf(marker);
    let end = file.content.length;
    let floor = 0;

    for (const other of otherMarkers) {
      const otherIndex = file.content.indexOf(other);
      if (otherIndex !== -1 && otherIndex < idIndex && otherIndex >= floor) {
        floor = otherIndex + other.length;
      }

      const laterIndex = file.content.indexOf(other, idIndex + marker.length);
      if (laterIndex !== -1 && laterIndex < end) {
        end = laterIndex;
      }
    }

    const before = file.content.slice(floor, idIndex);
    const heading = before.lastIndexOf("\n#");
    const start = heading === -1 ? floor : floor + heading + 1;

    return {
      path: file.path,
      content: file.content.slice(start, end),
    };
  });

  return {
    path: regions[0]?.path,
    content: regions.map((region) => region.content).join("\n"),
  };
}

export function representsActivation(
  region: string,
  mode: string,
): boolean {
  if (
    containsLiteral(region, `**Activation:** ${mode}`) ||
    containsLiteral(region, `Activation: ${mode}`)
  ) {
    return true;
  }

  switch (mode) {
    case "always":
      return (
        /alwaysApply:\s*true/.test(region) || /trigger:\s*always_on/.test(region)
      );
    case "scoped":
      return (
        /trigger:\s*glob/.test(region) ||
        /^paths:/m.test(region) ||
        /\nglobs:/.test(region)
      );
    case "manual":
      return /trigger:\s*manual/.test(region);
    case "agent_decides":
      return /trigger:\s*model_decision/.test(region);
    default:
      return false;
  }
}

export function representsPriority(region: string, priority: string): boolean {
  return (
    containsLiteral(region, `**Priority:** ${priority}`) ||
    containsLiteral(region, `Priority: ${priority}`)
  );
}
