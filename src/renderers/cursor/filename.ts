const UNSAFE_CHARACTERS = /[^A-Za-z0-9._-]+/g;

function stripMdcExtension(name: string): string {
  return name.toLowerCase().endsWith(".mdc") ? name.slice(0, -4) : name;
}

export function toSafeRuleFilename(id: string): string {
  const collapsed = id
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .join("-")
    .replace(UNSAFE_CHARACTERS, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  const base = stripMdcExtension(collapsed);
  return `${base.length > 0 ? base : "rule"}.mdc`;
}

export function uniqueRuleFilenames(ids: readonly string[]): string[] {
  const used = new Map<string, number>();

  return ids.map((id) => {
    const base = stripMdcExtension(toSafeRuleFilename(id));
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? `${base}.mdc` : `${base}-${String(count + 1)}.mdc`;
  });
}
