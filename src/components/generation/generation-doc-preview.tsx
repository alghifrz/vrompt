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
      <MarkdownPreview content={content} />
    </div>
  );
}

function PrdVisual({ prd }: { prd: PrdView }) {
  const groups = {
    must: prd.features.filter((feature) => feature.priority === "must"),
    should: prd.features.filter((feature) => feature.priority === "should"),
    later: prd.features.filter((feature) => feature.priority === "later"),
  };
  const architecture = [
    "User",
    prd.stack[0] ?? "Web app",
    prd.architectureStyle ?? prd.stack[1] ?? "Application",
    prd.stack.find((item) => /sql|db|postgres|mongo|neon/i.test(item)) ?? "Database",
  ];

  return (
    <div className="space-y-4">
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

      {prd.goals.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
            Goals
          </p>
          <ol className="space-y-2">
            {prd.goals.map((goal, index) => (
              <li
                key={goal}
                className="flex gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-sm leading-6"
              >
                <span className="font-mono text-[11px] text-[#d4f26a]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{goal}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {prd.users.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {prd.users.map((user) => (
            <article
              key={user.name}
              className="rounded-2xl border border-white/8 bg-white/3 p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                Persona
              </p>
              <p className="mt-1 text-sm font-medium">{user.name}</p>
              <p className="mt-1 text-sm leading-6 text-white/50">{user.description}</p>
              {user.goals.length > 0 ? (
                <p className="mt-2 text-xs leading-5 text-white/40">
                  Jobs: {user.goals.join(" · ")}
                </p>
              ) : null}
              {user.permissions.length > 0 ? (
                <p className="mt-1 text-xs text-white/40">
                  {user.permissions.join(" · ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
          Journey
        </p>
        <ol className="flex flex-wrap items-center gap-2">
          {[
            prd.users[0]?.name ?? "User",
            "Sign in",
            "Home",
            ...prd.features.slice(0, 3).map((feature) => feature.name),
            "Done",
          ].map((step, index, all) => (
            <li key={`${step}-${String(index)}`} className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-[#101010] px-3 py-1 text-xs text-white/80">
                {step}
              </span>
              {index < all.length - 1 ? (
                <span aria-hidden="true" className="text-white/25">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            ["Must", groups.must],
            ["Should", groups.should],
            ["Later", groups.later],
          ] as const
        ).map(([label, features]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-[#101010]/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</p>
            <ul className="mt-2 space-y-2">
              {features.length === 0 ? (
                <li className="text-sm text-white/35">None</li>
              ) : (
                features.map((feature) => (
                  <li
                    key={feature.name}
                    className="rounded-xl border border-white/8 bg-white/3 px-3 py-2"
                  >
                    <p className="text-sm">{feature.name}</p>
                    <p className="mt-1 text-xs leading-5 text-white/40">{feature.description}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
          Architecture
        </p>
        <ol className="flex flex-wrap items-center gap-2">
          {architecture.map((step, index) => (
            <li key={`${step}-${String(index)}`} className="flex items-center gap-2">
              <span className="rounded-xl border border-[#d4f26a]/20 bg-[#d4f26a]/8 px-3 py-1.5 text-xs text-[#d4f26a]">
                {step}
              </span>
              {index < architecture.length - 1 ? (
                <span aria-hidden="true" className="text-white/25">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {prd.endpoints.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {prd.endpoints.map((endpoint) => (
            <span
              key={endpoint}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/65"
            >
              {endpoint}
            </span>
          ))}
        </div>
      ) : null}

      {prd.stack.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {prd.stack.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
            >
              {item}
            </span>
          ))}
        </div>
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
      <ErdDiagram erd={erd} />
      {erd.links.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {erd.links.map((link) => (
            <li
              key={`${link.from}-${link.to}-${link.label}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65"
            >
              {link.from} <span className="text-white/30">— {link.kind} →</span> {link.to}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ErdDiagram({ erd }: { erd: ErdView }) {
  const boxWidth = 210;
  const headerHeight = 44;
  const rowHeight = 22;
  const gapX = 56;
  const gapY = 36;
  const cols = Math.min(Math.max(erd.entities.length, 1), 3);
  const heights = erd.entities.map(
    (entity) => headerHeight + entity.fields.length * rowHeight + 10,
  );
  const rowMax: number[] = [];
  heights.forEach((height, index) => {
    const row = Math.floor(index / cols);
    rowMax[row] = Math.max(rowMax[row] ?? 0, height);
  });
  const boxes = erd.entities.map((entity, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const y = rowMax.slice(0, row).reduce((sum, item) => sum + item + gapY, 0);
    return {
      entity,
      x: col * (boxWidth + gapX),
      y,
      height: heights[index]!,
    };
  });
  const width = Math.max(cols * boxWidth + (cols - 1) * gapX, boxWidth);
  const height = Math.max(
    ...boxes.map((box) => box.y + box.height),
    120,
  );
  const byId = new Map(boxes.map((box) => [box.entity.id, box]));

  return (
    <svg
      role="img"
      aria-label="Entity relationship diagram"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      className="w-full overflow-visible rounded-2xl border border-white/8 bg-[#0a0a0a]"
    >
      {erd.links.map((link) => {
        const from = byId.get(link.from);
        const to = byId.get(link.to);
        if (!from || !to) {
          return null;
        }
        const startX = from.x + boxWidth;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y + headerHeight + 12;
        const midX = (startX + endX) / 2;
        return (
          <g key={`${link.from}-${link.to}-${link.label}`}>
            <path
              d={`M ${String(startX)} ${String(startY)} C ${String(midX)} ${String(startY)}, ${String(midX)} ${String(endY)}, ${String(endX)} ${String(endY)}`}
              fill="none"
              stroke="rgba(212,242,106,0.45)"
              strokeWidth="1.5"
            />
            <polygon
              points={`${String(endX)},${String(endY)} ${String(endX - 6)},${String(endY - 4)} ${String(endX - 6)},${String(endY + 4)}`}
              fill="rgba(212,242,106,0.7)"
            />
          </g>
        );
      })}
      {boxes.map((box) => (
        <g key={box.entity.id} transform={`translate(${String(box.x)} ${String(box.y)})`}>
          <rect
            width={boxWidth}
            height={box.height}
            rx="12"
            fill="#101010"
            stroke="rgba(255,255,255,0.12)"
          />
          <rect
            width={boxWidth}
            height={headerHeight}
            rx="12"
            fill="rgba(212,242,106,0.12)"
          />
          <rect x="0" y="32" width={boxWidth} height="12" fill="rgba(212,242,106,0.12)" />
          <text x="12" y="20" fill="#d4f26a" fontSize="12" fontWeight="600">
            {box.entity.name}
          </text>
          <text x="12" y="36" fill="rgba(255,255,255,0.4)" fontSize="9">
            {truncate(box.entity.description, 32)}
          </text>
          {box.entity.fields.map((field, index) => (
            <g key={field.name}>
              <text
                x="12"
                y={headerHeight + 16 + index * rowHeight}
                fill="rgba(255,255,255,0.82)"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="10"
              >
                {field.name}
              </text>
              <text
                x={boxWidth - 12}
                y={headerHeight + 16 + index * rowHeight}
                fill={field.key ? "#d4f26a" : "rgba(255,255,255,0.35)"}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="10"
                textAnchor="end"
              >
                {field.key ? `${field.type} ${field.key}` : field.type}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const blocks = splitMarkdown(content);

  return (
    <div className="space-y-3 border-t border-white/8 pt-4">
      {blocks.map((block, index) => {
        if (block.type === "mermaid") {
          return (
            <pre
              key={`m-${String(index)}`}
              className="overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 font-mono text-[11px] leading-5 text-white/45"
            >
              {block.body}
            </pre>
          );
        }

        return (
          <div key={`t-${String(index)}`} className="space-y-2 text-sm leading-6 text-white/70">
            {block.body.split("\n").map((line, lineIndex) => {
              if (line.startsWith("# ")) {
                return (
                  <h3 key={lineIndex} className="text-base font-semibold text-white">
                    {line.slice(2)}
                  </h3>
                );
              }
              if (line.startsWith("## ") || line.startsWith("### ")) {
                return (
                  <h4 key={lineIndex} className="pt-1 text-sm font-medium text-white/90">
                    {line.replace(/^#+\s/, "")}
                  </h4>
                );
              }
              if (line.startsWith("|")) {
                return (
                  <p key={lineIndex} className="font-mono text-xs text-white/50">
                    {line}
                  </p>
                );
              }
              if (line.startsWith("- ") || line.startsWith("- [")) {
                return (
                  <p key={lineIndex} className="pl-3">
                    {line}
                  </p>
                );
              }
              if (!line.trim()) {
                return null;
              }
              return <p key={lineIndex}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
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

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
