export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

export function headingText(value: string): string {
  return normalizeNewlines(value).replace(/\s+/g, " ").trim();
}

export function escapeTableCell(value: string): string {
  return headingText(value).replace(/\|/g, "\\|");
}

export function inlineCode(value: string): string {
  const normalized = headingText(value);
  const runs = normalized.match(/`+/g);
  const longest = runs
    ? runs.reduce((max, run) => Math.max(max, run.length), 0)
    : 0;
  const ticks = "`".repeat(longest + 1);
  const needsPad = normalized.startsWith("`") || normalized.endsWith("`");
  const inner = needsPad ? ` ${normalized} ` : normalized;
  return `${ticks}${inner}${ticks}`;
}

export function labeledValue(label: string, value: string): string {
  const normalized = normalizeNewlines(value);
  if (normalized.includes("\n")) {
    return `**${label}:**\n\n${normalized}`;
  }

  return `**${label}:** ${normalized}`;
}

export function bulletList(items: readonly string[]): string {
  return items
    .map((item) => {
      const lines = normalizeNewlines(item).split("\n");
      return lines
        .map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`))
        .join("\n");
    })
    .join("\n");
}

export function joinBlocks(blocks: readonly (string | undefined)[]): string {
  return blocks.filter((block): block is string => Boolean(block)).join("\n\n");
}

export function twoColumnTable(
  headers: readonly [string, string],
  rows: readonly (readonly [string, string])[],
): string {
  const [left, right] = headers;
  const header = `| ${escapeTableCell(left)} | ${escapeTableCell(right)} |`;
  const divider = "| --- | --- |";
  const body = rows
    .map(([first, second]) => `| ${escapeTableCell(first)} | ${escapeTableCell(second)} |`)
    .join("\n");

  return `${header}\n${divider}\n${body}`;
}
