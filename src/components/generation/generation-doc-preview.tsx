import type { ReactNode } from "react";
import type { ErdView, PrdView } from "../../core/generation/docs";

export function GenerationDocPreview({
  path,
  content,
  prd,
  erd,
}: {
  path: string;
  content: string;
  prd?: PrdView;
  erd?: ErdView;
}) {
  const isPrd = path.endsWith("PRD.md") && prd;
  const isErd = path.endsWith("ERD.md") && erd;

  return (
    <div
      aria-label={`Preview of ${path}`}
      className="max-h-[36rem] space-y-5 overflow-auto p-4 scrollbar-thin"
    >
      {isPrd ? <PrdVisual prd={prd} /> : null}
      {isErd ? <ErdVisual erd={erd} /> : null}
      <MarkdownPreview content={content} skipChrome={Boolean(isPrd || isErd)} />
    </div>
  );
}

function PrdVisual({ prd }: { prd: PrdView }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#d4f26a]/20 bg-[#d4f26a]/8 p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#d4f26a]">
          Product
        </p>
        <p className="mt-1 text-lg font-medium">{prd.name}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/35">{prd.type}</p>
        <p className="mt-2 text-sm leading-6 text-white/70">{prd.description}</p>
        <p className="mt-2 text-sm leading-6 text-white/50">
          <span className="text-white/35">Problem: </span>
          {prd.problem}
        </p>
      </div>

      <PreviewTable
        caption="Document control"
        headers={["Field", "Value"]}
        rows={[
          ["Product", prd.name],
          ["Type", prd.type],
          ["Audience", prd.users.map((user) => user.name).join(", ") || "—"],
          ["Primary goal", prd.goals[0] ?? "—"],
        ]}
      />

      {prd.features.length > 0 ? (
        <PreviewTable
          caption="Feature catalog"
          headers={["Feature", "Priority", "Status", "What it does"]}
          rows={prd.features.map((feature) => [
            feature.name,
            feature.priority,
            feature.status,
            feature.description,
          ])}
        />
      ) : null}

      {prd.users.length > 0 ? (
        <PreviewTable
          caption="Personas"
          headers={["Persona", "Job", "Permissions"]}
          rows={prd.users.map((user) => [
            `${user.name} — ${user.description}`,
            user.goals.join("; ") || "—",
            user.permissions.join(", ") || "—",
          ])}
        />
      ) : null}

      {prd.endpoints.length > 0 ? (
        <PreviewTable
          caption="API"
          headers={["Endpoint"]}
          rows={prd.endpoints.map((endpoint) => [endpoint])}
        />
      ) : null}
    </div>
  );
}

function ErdVisual({ erd }: { erd: ErdView }) {
  return (
    <div className="space-y-4">
      {erd.inferred ? (
        <p className="text-xs text-white/40">
          Inferred starting model — refine after the first tables exist.
        </p>
      ) : null}
      <div
        role="img"
        aria-label="Entity relationship diagram"
        className="grid gap-3 lg:grid-cols-2"
      >
        {erd.entities.map((entity) => (
          <article
            key={entity.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]"
          >
            <header className="border-b border-[#d4f26a]/25 bg-[#d4f26a]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#d4f26a]">{entity.name}</p>
              <p className="mt-0.5 text-xs leading-5 text-white/45">{entity.description}</p>
            </header>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-white/35">
                  <th className="px-3 py-1.5 font-medium">Attribute</th>
                  <th className="px-3 py-1.5 font-medium">Type</th>
                  <th className="px-3 py-1.5 font-medium">Key</th>
                  <th className="px-3 py-1.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entity.fields.map((item) => (
                  <tr key={item.name} className="border-t border-white/6">
                    <td className="px-3 py-1.5 font-mono text-white/85">{item.name}</td>
                    <td className="px-3 py-1.5 text-white/45">{item.type}</td>
                    <td className="px-3 py-1.5 font-mono text-[#d4f26a]/85">{item.key ?? "—"}</td>
                    <td className="px-3 py-1.5 text-white/45">{item.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
      {erd.links.length > 0 ? (
        <PreviewTable
          caption="Relationships"
          headers={["Parent", "Child", "Cardinality", "Meaning"]}
          rows={erd.links.map((link) => [link.from, link.to, link.kind, link.label])}
        />
      ) : null}
    </div>
  );
}

function PreviewTable({
  caption,
  headers,
  rows,
}: {
  caption?: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
      {caption ? (
        <p className="border-b border-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-white/40">
          {caption}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-xs">
          <thead>
            <tr className="border-b border-white/8 text-white/40">
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0] ?? "row"}-${String(index)}`} className="border-t border-white/6">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${headers[cellIndex] ?? String(cellIndex)}-${cell}`}
                    className={`px-3 py-2 leading-5 ${
                      cellIndex === 0 ? "text-white/85" : "text-white/55"
                    }`}
                  >
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarkdownPreview({
  content,
  skipChrome = false,
}: {
  content: string;
  skipChrome?: boolean;
}) {
  const blocks = splitMarkdown(content);

  return (
    <div className="space-y-3 border-t border-white/8 pt-4">
      {blocks.map((block, index) => {
        if (block.type === "mermaid") {
          return skipChrome ? null : (
            <pre
              key={`m-${String(index)}`}
              className="overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 font-mono text-[11px] leading-5 text-white/45"
            >
              {block.body}
            </pre>
          );
        }

        return (
          <MarkdownText
            key={`t-${String(index)}`}
            body={block.body}
            skipTables={skipChrome}
          />
        );
      })}
    </div>
  );
}

function MarkdownText({
  body,
  skipTables = false,
}: {
  body: string;
  skipTables?: boolean;
}) {
  const nodes: ReactNode[] = [];
  const lines = body.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const next = lines[index + 1];
    if (isTableRow(line) && next && isSeparatorRow(next)) {
      const table: string[] = [];
      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        table.push(lines[index] ?? "");
        index += 1;
      }
      const parsed = parseMarkdownTable(table);
      if (parsed && !skipTables) {
        nodes.push(
          <PreviewTable
            key={`table-${String(nodes.length)}`}
            headers={parsed.headers}
            rows={parsed.rows}
          />,
        );
      }
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h3 key={nodes.length} className="text-base font-semibold text-white">
          {line.slice(2)}
        </h3>,
      );
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      nodes.push(
        <h4 key={nodes.length} className="pt-1 text-sm font-medium text-white/90">
          {line.replace(/^#+\s/, "")}
        </h4>,
      );
    } else if (line.startsWith("- ") || line.startsWith("- [")) {
      nodes.push(
        <p key={nodes.length} className="pl-3 text-sm leading-6 text-white/70">
          {line}
        </p>,
      );
    } else if (line.trim()) {
      nodes.push(
        <p key={nodes.length} className="text-sm leading-6 text-white/70">
          {line}
        </p>,
      );
    }

    index += 1;
  }

  return <div className="space-y-2">{nodes}</div>;
}

function splitMarkdown(content: string): { type: "text" | "mermaid"; body: string }[] {
  const parts = content.split(/```mermaid\n?|```/);
  return parts
    .map((part, index) => ({
      type: index % 2 === 1 ? ("mermaid" as const) : ("text" as const),
      body: part.trim(),
    }))
    .filter((part) => part.body.length > 0);
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return isTableRow(line) && parseCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownTable(lines: readonly string[]): { headers: string[]; rows: string[][] } | null {
  const [headerLine, , ...body] = lines;
  if (!headerLine) {
    return null;
  }
  return {
    headers: parseCells(headerLine),
    rows: body.filter((line) => !isSeparatorRow(line)).map(parseCells),
  };
}
