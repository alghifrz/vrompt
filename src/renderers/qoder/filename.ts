const UNSAFE_CHARACTERS = /[^A-Za-z0-9._-]+/g;

function stripKnownExtension(name: string): string {
  return name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
}

export function toSafeQoderFilename(id: string): string {
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

  const base = stripKnownExtension(collapsed);
  return `${base.length > 0 ? base : "rule"}.md`;
}

export function uniqueQoderFilenames(ids: readonly string[]): string[] {
  const used = new Map<string, number>();

  return ids.map((id) => {
    const base = stripKnownExtension(toSafeQoderFilename(id));
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? `${base}.md` : `${base}-${String(count + 1)}.md`;
  });
}
