import { WindowFrame } from "./ui";

const phases = [
  { label: "Idea", done: true },
  { label: "Users", done: true },
  { label: "Stack", done: true },
  { label: "Constraints", done: true },
  { label: "Rules", done: false },
  { label: "Ready", done: false },
];

const targets = ["Cursor", "Qoder", "Claude Code", "AGENTS.md"];

export function HeroMock() {
  return (
    <WindowFrame title="vrompt · marketplace-api · ProjectSpec">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
            Interview
          </p>
          <ol className="mt-4 space-y-3">
            {phases.map((phase) => (
              <li key={phase.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid size-5 place-items-center rounded-full text-[10px] ${
                    phase.done
                      ? "bg-[#d4f26a] text-[#14160c]"
                      : "border border-white/15 text-white/40"
                  }`}
                >
                  {phase.done ? "✓" : ""}
                </span>
                <span className={phase.done ? "text-white" : "text-white/45"}>
                  {phase.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-white/40">5 of 8 questions answered</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              ProjectSpec
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-white/40">Name</dt>
                <dd className="text-white">Marketplace API</dd>
              </div>
              <div>
                <dt className="text-white/40">Problem</dt>
                <dd className="text-white/80">
                  Sellers need a typed contract before an agent writes the
                  service.
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Stack</dt>
                <dd className="text-white/80">Next.js · PostgreSQL · Clerk</dd>
              </div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {targets.map((target) => (
              <div
                key={target}
                className="rounded-xl border border-[#d4f26a]/20 bg-[#d4f26a]/8 px-3 py-2 text-xs text-[#d4f26a]"
              >
                {target}
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

export function InterviewMock() {
  return (
    <WindowFrame title="Interview · marketplace-api">
      <div className="space-y-3">
        <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white/8 px-3.5 py-2.5 text-sm leading-6 text-white/85">
          Who is this for, and what should the first useful version do?
        </div>
        <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-[#d4f26a]/12 px-3.5 py-2.5 text-sm leading-6 text-[#eef6c8]">
          Solo sellers. They should publish a listing and receive an order
          webhook without writing the brief twice.
        </div>
        <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white/8 px-3.5 py-2.5 text-sm leading-6 text-white/85">
          Which coding agents should receive the generated context?
        </div>
        <p className="text-xs text-white/35">Phase 2 of 4 · Users</p>
      </div>
    </WindowFrame>
  );
}

export function SpecMock() {
  return (
    <WindowFrame title="Review · ProjectSpec">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Goal", "Typed marketplace API with reviewable agent rules"],
          ["Users", "Solo sellers and a single operator"],
          ["Non-goals", "Billing, marketplace, GitHub sync"],
          ["Constraints", "Core stays free of Next.js and Clerk"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              {label}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/85">{value}</p>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

export function RulesMock() {
  return (
    <WindowFrame title="Generate · .cursor/rules">
      <pre className="overflow-x-auto rounded-2xl bg-black/40 p-4 font-mono text-[12px] leading-6 text-[#d4f26a]/90">
        {`# Marketplace API
- ProjectSpec is the source of truth
- Do not invent billing or GitHub sync
- Keep Core free of Next.js and Clerk
- Generate Cursor, Qoder, Claude Code, AGENTS.md`}
      </pre>
    </WindowFrame>
  );
}

export function ExportMock() {
  return (
    <WindowFrame title="Export · vrompt-export.zip">
      <ul className="space-y-2.5 text-sm">
        {[
          "vrompt-export/cursor/.cursor/rules/project.mdc",
          "vrompt-export/qoder/.qoder/rules/project.md",
          "vrompt-export/claude-code/CLAUDE.md",
          "vrompt-export/agents-md/AGENTS.md",
        ].map((path) => (
          <li
            key={path}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="truncate font-mono text-[12px] text-white/75">
              {path}
            </span>
            <span className="text-[11px] text-[#d4f26a]">ready</span>
          </li>
        ))}
      </ul>
    </WindowFrame>
  );
}
