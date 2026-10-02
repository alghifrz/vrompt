"use client";

import { useUser } from "@clerk/nextjs";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { startInterviewAction } from "../../app/actions/interview";
import {
  WORKSPACE_STAGE_LABELS,
  type WorkspaceProject,
} from "../../lib/workspace/projects";
import { landingEase, useLandingMotion } from "../landing/motion";
import { AppShell } from "../app/app-shell";
import { StartSubmitButton } from "../start-submit-button";

const steps = [
  {
    label: "Interview",
    detail: "Answer a short set of questions about the idea, users, and constraints.",
    tag: "Up next",
  },
  {
    label: "Review",
    detail: "Check the spec. Continue when names, features, and rules look right.",
    tag: "Then",
  },
  {
    label: "Generate",
    detail: "Download the ZIP, drop it in the repo, then paste jobs in order.",
    tag: "Finally",
  },
] as const;

const tools = [
  { name: "Cursor", hint: ".cursor/rules" },
  { name: "Qoder", hint: ".qoder/rules" },
  { name: "Claude Code", hint: "CLAUDE.md" },
  { name: "Docs", hint: "PRD.md · ERD.md" },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: landingEase } },
};

/* ---------- Kartu dengan cursor spotlight ---------- */

function SpotCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const enabled = useLandingMotion();
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, rgba(212,242,106,0.09), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <div
      onMouseMove={enabled ? onMove : undefined}
      className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-[#111111] transition-colors duration-300 hover:border-white/20 ${className}`}
    >
      {enabled ? (
        <motion.div
          aria-hidden="true"
          style={{ background: glow }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/* ---------- Screen ---------- */

export function StartScreen({
  error,
  projects = [],
}: {
  error?: boolean;
  projects?: readonly WorkspaceProject[];
}) {
  const { user } = useUser();
  const enabled = useLandingMotion();
  const name = user?.firstName ?? user?.username ?? "there";
  const latest = projects[0];

  return (
    <AppShell title="New project" currentStep={-1} projects={projects}>
      <motion.main
        className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12"
        initial={enabled ? "hidden" : false}
        animate="show"
        variants={container}
      >
        {/* Heading */}
        <motion.p variants={item} className="inline-flex items-center gap-2 text-sm text-white/50">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#d4f26a]" />
          Hi, {name}
        </motion.p>
        <motion.h1
          variants={item}
          className="landing-display mt-3 max-w-2xl text-4xl leading-[1.1] text-balance sm:text-5xl"
        >
          Turn an idea into a{" "}
          <span className="italic text-[#d4f26a]">real spec</span>
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
          Interview, review the spec, then download a ZIP for Cursor — one
          sitting, no extra setup.
        </motion.p>

        {latest ? (
          <motion.div variants={item} className="mt-6">
            <Link
              href={latest.href}
              className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#d4f26a]/25 bg-[#d4f26a]/8 px-4 py-3 transition-colors hover:border-[#d4f26a]/45 hover:bg-[#d4f26a]/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
            >
              <span className="min-w-0">
                <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4f26a]">
                  Continue
                </span>
                <span className="mt-0.5 block truncate text-sm font-medium text-white">
                  {latest.name}
                </span>
              </span>
              <span className="shrink-0 text-xs text-white/45">
                {WORKSPACE_STAGE_LABELS[latest.stage]} →
              </span>
            </Link>
          </motion.div>
        ) : null}

        {/* Create + Exports */}
        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
          <motion.section variants={item} aria-labelledby="create-title">
            {/* border gradient */}
            <div className="relative h-full rounded-[22px] bg-gradient-to-b from-[#d4f26a]/35 via-white/10 to-white/[0.04] p-px">
              <div className="relative h-full overflow-hidden rounded-[21px] bg-[#0f110a] p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#d4f26a]/15 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_65%)]"
                />

                <div className="relative">
                  <span className="grid size-11 place-items-center rounded-2xl border border-[#d4f26a]/30 bg-[#d4f26a]/10 text-lg text-[#d4f26a]">
                    <motion.span
                      aria-hidden="true"
                      animate={enabled ? { rotate: [0, 90, 90, 0] } : undefined}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      +
                    </motion.span>
                  </span>

                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4f26a]">
                    Create
                  </p>
                  <h2 id="create-title" className="landing-display mt-2 text-3xl text-white">
                    New draft project
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/55">
                    No extra fields. The interview opens as soon as the project is
                    created.
                  </p>

                  {error ? (
                    <motion.p
                      role="alert"
                      initial={enabled ? { opacity: 0, x: 0 } : false}
                      animate={enabled ? { opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1 }}
                      transition={{ duration: 0.45 }}
                      className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      <span aria-hidden="true" className="mt-px">!</span>
                      The project could not be created. Please try again.
                    </motion.p>
                  ) : null}

                  <form action={startInterviewAction} className="mt-7 max-w-sm">
                    <StartSubmitButton />
                  </form>

                  <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/40">
                    {["Free in beta", "Editable spec", "Local export"].map((t) => (
                      <li key={t} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="text-[#d4f26a]">✓</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section variants={item} aria-labelledby="exports-title" className="h-full">
            <SpotCard className="h-full p-5 sm:p-6">
              <p
                id="exports-title"
                className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35"
              >
                After interview
              </p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Generated files stay derived from ProjectSpec.
              </p>
              <ul className="mt-5 space-y-2">
                {tools.map((tool, i) => (
                  <motion.li
                    key={tool.name}
                    initial={enabled ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07, duration: 0.4, ease: landingEase }}
                    whileHover={enabled ? { x: 3 } : undefined}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-[#d4f26a]/30"
                  >
                    <span className="text-sm text-white/80">{tool.name}</span>
                    <span className="truncate font-mono text-[11px] text-white/30">
                      {tool.hint}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </SpotCard>
          </motion.section>
        </div>

        {/* What happens next */}
        <motion.section variants={item} className="mt-12" aria-labelledby="next-title">
          <h2 id="next-title" className="flex items-center gap-3 text-sm font-medium text-white/80">
            What happens next
            <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </h2>

          <ol className="mt-4 grid gap-3 md:grid-cols-3" aria-label="What happens next">
            {steps.map((step, index) => (
              <li key={step.label} className="relative">
                <SpotCard className="h-full p-5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid size-8 place-items-center rounded-full border font-mono text-[11px] font-semibold ${
                        index === 0
                          ? "border-[#d4f26a] bg-[#d4f26a] text-[#14160c]"
                          : "border-white/15 text-white/45"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        index === 0 ? "text-[#d4f26a]" : "text-white/25"
                      }`}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] font-medium text-white">{step.label}</p>
                  <p className="mt-1.5 text-xs leading-5 text-white/45">{step.detail}</p>
                </SpotCard>

                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-[1.1rem] top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#0c0c0c] text-[10px] text-white/40 md:grid"
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </motion.section>
      </motion.main>
    </AppShell>
  );
}