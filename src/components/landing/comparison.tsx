"use client";

import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { sectionClass } from "./styles";
import { SectionHeading } from "./ui";

const rows = [
  ["Starting point", "Blank chat and scattered notes", "Guided interview"],
  ["Source of truth", "Prompts that disappear", "Typed ProjectSpec"],
  ["Tool output", "Copy-paste per agent", "Deterministic adapters"],
  ["Consistency", "Each tool gets a different brief", "One spec, many targets"],
  ["Review", "After the agent already wrote code", "Before you export"],
  ["Targets", "One tool at a time", "Cursor, Qoder, Claude, AGENTS.md"],
] as const;

/* ---------- Variants ---------- */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: landingEase } },
};

// diwarisi dari row, jadi centang tergambar tepat saat row-nya muncul
const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.45, ease: landingEase, delay: 0.15 },
  },
};

/* ---------- Icons ---------- */

function AnimatedCheck() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full bg-[#d4f26a]/15 ring-1 ring-inset ring-[#d4f26a]/30"
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-[#d4f26a]" fill="none">
        <motion.path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={draw}
        />
      </svg>
    </span>
  );
}

function XMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10"
    >
      <svg viewBox="0 0 16 16" className="size-3 text-rose-300/60" fill="none">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* ---------- Section ---------- */

export function LandingComparison() {
  const enabled = useLandingMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className={`${sectionClass} relative mt-28 sm:mt-36`}>
      <Reveal>
        <SectionHeading
          eyebrow="Comparison"
          title="Why developers start with Vrompt"
          description="Keep the conversation useful, then lock the result into a spec your tools can share."
        />
      </Reveal>

      {/* ===== Desktop: versus layout ===== */}
      <div
        role="table"
        aria-label="Vrompt compared with a blank coding-agent chat"
        className="relative mt-16 hidden md:block"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Panel Vrompt yang "terangkat" (lebar = kolom ke-3 = 40%) */}
        <motion.div
          aria-hidden="true"
          initial={enabled ? { opacity: 0, scaleY: 0.96 } : false}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: landingEase }}
          className="pointer-events-none absolute -bottom-4 -top-4 right-0 w-[40%] origin-top rounded-[28px] border border-[#d4f26a]/25 bg-gradient-to-b from-[#d4f26a]/[0.12] via-[#d4f26a]/[0.04] to-transparent shadow-[0_0_90px_-25px_rgba(212,242,106,0.4)]"
        >
          <span className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4f26a]/60 to-transparent" />
        </motion.div>

        {/* Header */}
        <div role="row" className="relative grid grid-cols-[28%_32%_40%] items-center">
          <div role="columnheader" className="px-6 py-5 text-xs uppercase tracking-[0.18em] text-white/35">
            Setup
          </div>
          <div role="columnheader" className="px-6 py-5 text-sm font-medium text-white/50">
            Other tools
          </div>
          <div
            role="columnheader"
            className="flex items-center gap-2.5 px-6 py-5 text-sm font-semibold text-[#d4f26a]"
          >
            <motion.span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#d4f26a]"
              animate={enabled ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Vrompt
          </div>
        </div>

        {/* Rows */}
        <motion.div
          role="rowgroup"
          className="relative"
          initial={enabled ? "hidden" : false}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
        >
          {rows.map(([label, other, ours], i) => {
            const dim = enabled && hovered !== null && hovered !== i;
            return (
              <motion.div
                key={label}
                role="row"
                variants={rowVariants}
                onMouseEnter={() => setHovered(i)}
                className="relative border-t border-white/[0.06]"
              >
                {enabled && hovered === i ? (
                  <motion.span
                    aria-hidden="true"
                    layoutId="comparison-row-highlight"
                    className="absolute inset-x-1 inset-y-1 rounded-2xl bg-white/[0.045]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}

                <div
                  className={`relative grid grid-cols-[28%_32%_40%] items-center transition-opacity duration-300 ${
                    dim ? "opacity-40" : "opacity-100"
                  }`}
                >
                  <div role="rowheader" className="px-6 py-5 text-sm font-medium text-white/80">
                    {label}
                  </div>
                  <div role="cell" className="flex items-center gap-3 px-6 py-5 text-sm text-white/40">
                    <XMark />
                    {other}
                  </div>
                  <div role="cell" className="flex items-center gap-3 px-6 py-5 text-[15px] text-white">
                    <AnimatedCheck />
                    {ours}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ===== Mobile: kartu per baris ===== */}
      <motion.ul
        className="mt-10 space-y-3 md:hidden"
        initial={enabled ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        variants={container}
      >
        {rows.map(([label, other, ours]) => (
          <motion.li
            key={label}
            variants={rowVariants}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010]"
          >
            <p className="px-5 pt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
              {label}
            </p>
            <div className="flex items-start gap-3 px-5 py-3.5 text-sm text-white/45">
              <XMark />
              <span>
                <span className="block text-[10px] uppercase tracking-widest text-white/25">
                  Other tools
                </span>
                {other}
              </span>
            </div>
            <div className="flex items-start gap-3 border-t border-[#d4f26a]/15 bg-[#d4f26a]/[0.07] px-5 py-3.5 text-[15px] text-white">
              <AnimatedCheck />
              <span>
                <span className="block text-[10px] uppercase tracking-widest text-[#d4f26a]/70">
                  Vrompt
                </span>
                {ours}
              </span>
            </div>
          </motion.li>
        ))}
      </motion.ul>

      {/* ===== CTA ===== */}
      <Reveal delay={0.1}>
        <div className="relative mt-20 overflow-hidden rounded-[32px] border border-white/10 bg-[#101010] px-6 py-8 sm:px-10 sm:py-10">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#d4f26a]/15 blur-3xl"
            animate={enabled ? { opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] } : undefined}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_right,transparent,black_75%)]"
          />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d4f26a]">
                Free in beta
              </p>
              <h3 className="landing-display mt-3 text-3xl leading-tight text-white text-balance">
                Start free, grow when we do
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#8a8a84]">
                Billing and team workspaces are not part of the MVP yet. Start a
                project today and pick up those pieces when they land.
              </p>
            </div>
            <StartButton>Start a project</StartButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}