"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type Variants,
} from "framer-motion";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { mutedClass, sectionClass } from "./styles";
import { SectionHeading } from "./ui";

/* ---------- Mini visuals ---------- */

const PHASES = ["Idea", "Users", "Stack", "Constraints"] as const;

function InterviewVisual() {
  const enabled = useLandingMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setStep((s) => (s + 1) % PHASES.length), 1600);
    return () => clearInterval(id);
  }, [enabled]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PHASES.map((phase, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={phase} className="flex items-center gap-2">
            <motion.span
              animate={{
                backgroundColor: current
                  ? "rgba(212,242,106,0.16)"
                  : "rgba(255,255,255,0.04)",
                borderColor: current
                  ? "rgba(212,242,106,0.5)"
                  : "rgba(255,255,255,0.08)",
                color: current ? "#d4f26a" : done ? "#d6d6d0" : "rgba(255,255,255,0.4)",
              }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
            >
              {done ? <span aria-hidden="true">✓</span> : null}
              {phase}
            </motion.span>
            {i < PHASES.length - 1 ? (
              <span aria-hidden="true" className="h-px w-3 bg-white/15" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const specLines = [
  ['"name"', '"vrompt"'],
  ['"stack"', '["next", "ts"]'],
  ['"users"', '["indie devs"]'],
  ['"status"', '"ready"'],
] as const;

function SpecVisual() {
  return (
    <motion.pre
      className="overflow-hidden rounded-xl border border-white/8 bg-black/40 p-4 font-mono text-[11px] leading-6 text-white/50"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
    >
      <span className="text-white/30">{"{"}</span>
      {specLines.map(([key, value]) => (
        <motion.span
          key={key}
          className="block pl-4"
          variants={{
            hidden: { opacity: 0, x: -8 },
            show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
          }}
        >
          <span className="text-[#d4f26a]/80">{key}</span>
          <span className="text-white/30">: </span>
          <span className="text-white/75">{value}</span>
        </motion.span>
      ))}
      <span className="text-white/30">
        {"}"}
        <motion.i
          aria-hidden="true"
          className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-[#d4f26a]"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </span>
    </motion.pre>
  );
}

function DeterministicVisual() {
  return (
    <div className="flex items-center gap-3">
      {["run #1", "run #2"].map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-3">
          <div className="flex-1 rounded-xl border border-white/8 bg-black/40 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">
              {label}
            </p>
            <p className="mt-1 font-mono text-xs text-[#d4f26a]">9f2c·a41b</p>
          </div>
          {i === 0 ? (
            <motion.span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-[#d4f26a]/15 text-sm text-[#d4f26a]"
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              =
            </motion.span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const targets = ["Cursor", "Qoder", "Claude Code", "AGENTS.md"] as const;

function AdaptersVisual() {
  const line: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: landingEase } },
  };
  return (
    <motion.svg
      viewBox="0 0 300 132"
      className="h-auto w-full"
      role="img"
      aria-label="One spec fans out to four tool adapters"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      {targets.map((_, i) => {
        const y = i * 34 + 15;
        return (
          <motion.path
            key={i}
            d={`M64 66 C 120 66, 130 ${y}, 184 ${y}`}
            fill="none"
            stroke="rgba(212,242,106,0.55)"
            strokeWidth="1.2"
            variants={line}
          />
        );
      })}
      <rect x="0" y="48" width="64" height="36" rx="12" fill="rgba(212,242,106,0.15)" stroke="rgba(212,242,106,0.5)" />
      <text x="32" y="70" textAnchor="middle" fontSize="11" fill="#d4f26a" fontFamily="monospace">
        spec
      </text>
      {targets.map((name, i) => (
        <g key={name}>
          <rect x="184" y={i * 34 + 2} width="116" height="26" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
          <text x="242" y={i * 34 + 19} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)">
            {name}
          </text>
        </g>
      ))}
    </motion.svg>
  );
}

const reviewFiles = [".cursor/rules/project.mdc", "CLAUDE.md", "AGENTS.md"] as const;

function ReviewVisual() {
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(["CLAUDE.md", "AGENTS.md"]),
  );

  function toggle(file: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  }

  return (
    <ul className="space-y-1.5">
      {reviewFiles.map((file) => {
        const on = picked.has(file);
        return (
          <li key={file}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(file)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-left transition-colors hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
            >
              <motion.span
                aria-hidden="true"
                animate={{
                  backgroundColor: on ? "#d4f26a" : "rgba(255,255,255,0)",
                  borderColor: on ? "#d4f26a" : "rgba(255,255,255,0.2)",
                }}
                className="grid size-4 place-items-center rounded-md border text-[10px] font-bold text-black"
              >
                {on ? "✓" : ""}
              </motion.span>
              <span className={`font-mono text-xs ${on ? "text-white/80" : "text-white/35"}`}>
                {file}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const tree = ["vrompt-export/", "├─ .cursor/rules/", "├─ CLAUDE.md", "└─ AGENTS.md"] as const;

function ExportVisual() {
  return (
    <motion.div
      className="rounded-xl border border-white/8 bg-black/40 p-4"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      {tree.map((row, i) => (
        <motion.p
          key={row}
          className={`font-mono text-xs leading-6 ${i === 0 ? "text-[#d4f26a]" : "text-white/55"}`}
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
          }}
        >
          {row}
        </motion.p>
      ))}
      <motion.span
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d4f26a]/15 px-3 py-1 font-mono text-[11px] text-[#d4f26a]"
        variants={{
          hidden: { opacity: 0, scale: 0.9 },
          show: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
        }}
      >
        ↓ vrompt-export.zip
      </motion.span>
    </motion.div>
  );
}

/* ---------- Data ---------- */

const benefits: readonly {
  title: string;
  body: string;
  span: string;
  visual: ReactNode;
}[] = [
  {
    title: "Structured interview",
    body: "Questions arrive in phases, so the brief stays focused and the spec stays complete.",
    span: "lg:col-span-4",
    visual: <InterviewVisual />,
  },
  {
    title: "Canonical ProjectSpec",
    body: "One typed document owns the project. Generated markdown is always a derived output.",
    span: "lg:col-span-2",
    visual: <SpecVisual />,
  },
  {
    title: "Deterministic generation",
    body: "The same ready spec produces the same files. No surprise rewrite on every export.",
    span: "lg:col-span-2",
    visual: <DeterministicVisual />,
  },
  {
    title: "Tool-specific adapters",
    body: "Cursor, Qoder, Claude Code, and AGENTS.md each get a format they can actually use.",
    span: "lg:col-span-4",
    visual: <AdaptersVisual />,
  },
  {
    title: "Reviewable artifacts",
    body: "You see the spec and the target files before anything leaves Vrompt.",
    span: "lg:col-span-3",
    visual: <ReviewVisual />,
  },
  {
    title: "Export-ready ZIP",
    body: "Download only the targets you need, already namespaced under vrompt-export/.",
    span: "lg:col-span-3",
    visual: <ExportVisual />,
  },
];

/* ---------- Card dengan border spotlight ---------- */

function BentoCard({
  index,
  title,
  body,
  visual,
}: {
  index: number;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  const enabled = useLandingMotion();
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const fill = useMotionTemplate`radial-gradient(380px circle at ${mx}px ${my}px, rgba(212,242,106,0.09), transparent 70%)`;
  const edge = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(212,242,106,0.85), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <motion.article
      onMouseMove={enabled ? onMove : undefined}
      whileHover={enabled ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#101010] p-6 sm:p-7"
    >
      {enabled ? (
        <>
          <motion.div
            aria-hidden="true"
            style={{ background: fill }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <motion.div
            aria-hidden="true"
            style={{
              background: edge,
              padding: 1,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </>
      ) : null}

      <div className="relative flex items-center gap-3">
        <span className="font-mono text-xs text-[#d4f26a]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent transition-all duration-500 group-hover:from-[#d4f26a]/50"
        />
      </div>

      <h3 className="landing-display relative mt-5 text-2xl text-white">{title}</h3>
      <p className={`${mutedClass} relative mt-2 max-w-md text-sm`}>{body}</p>

      <div className="relative mt-auto pt-7">{visual}</div>
    </motion.article>
  );
}

/* ---------- Section ---------- */

export function LandingBenefits() {
  const enabled = useLandingMotion();

  return (
    <section id="benefits" className={`${sectionClass} relative mt-28 scroll-mt-32 sm:mt-36`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[80%] -translate-x-1/2 rounded-full bg-[#d4f26a]/[0.04] blur-3xl"
      />

      <Reveal>
        <SectionHeading
          eyebrow="Benefits"
          title="Built to brief agents without the chaos"
          description="Keep the source of truth in one place, then let adapters do the tool-specific work."
        />
      </Reveal>

      <motion.div
        className="mt-12 grid gap-4 lg:grid-cols-6"
        initial={enabled ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      >
        {benefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            className={benefit.span}
            variants={{
              hidden: { opacity: 0, y: 28, scale: 0.97 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.6, ease: landingEase },
              },
            }}
          >
            <BentoCard
              index={index}
              title={benefit.title}
              body={benefit.body}
              visual={benefit.visual}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}