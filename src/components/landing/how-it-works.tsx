"use client";

import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { InterviewMock, RulesMock, SpecMock } from "./mocks";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { mutedClass, sectionClass } from "./styles";
import { SectionHeading } from "./ui";

const steps: readonly {
  title: string;
  body: string;
  output: string;
  file: string;
  mock: ReactNode;
}[] = [
  {
    title: "Describe the idea",
    body: "Start a project and answer the first questions. Vrompt records the idea before any files are generated.",
    output: "Draft idea",
    file: "vrompt / interview",
    mock: <InterviewMock />,
  },
  {
    title: "Complete the interview",
    body: "Users, stack, constraints, and rules become a validated ProjectSpec you can still edit.",
    output: "Validated ProjectSpec",
    file: "vrompt / spec",
    mock: <SpecMock />,
  },
  {
    title: "Generate and export",
    body: "Choose Cursor, Qoder, Claude Code, or AGENTS.md, preview the output, then download the ZIP.",
    output: "vrompt-export.zip",
    file: "vrompt / export",
    mock: <RulesMock />,
  },
];

/* ---------- Node di garis timeline ---------- */

function TimelineNode({ index, reached }: { index: number; reached: boolean }) {
  const enabled = useLandingMotion();

  return (
    <div className="absolute left-0 top-1 z-10 md:left-1/2 md:-translate-x-1/2">
      <div className="relative grid size-10 place-items-center">
        {reached && enabled ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[#d4f26a]/30"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <motion.span
          animate={{
            backgroundColor: reached ? "#d4f26a" : "#101010",
            borderColor: reached ? "#d4f26a" : "rgba(255,255,255,0.15)",
            color: reached ? "#0c0c0c" : "rgba(255,255,255,0.45)",
            scale: reached ? 1 : 0.92,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="relative grid size-10 place-items-center rounded-full border font-mono text-xs font-semibold"
        >
          {String(index + 1).padStart(2, "0")}
        </motion.span>
      </div>
    </div>
  );
}

/* ---------- Satu step ---------- */

function Step({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const enabled = useLandingMotion();
  const ref = useRef<HTMLLIElement>(null);
  // node nyala saat step melewati tengah layar
  const reached = useInView(ref, { once: true, margin: "0px 0px -50% 0px" });
  const flip = index % 2 === 1;

  return (
    <li
      ref={ref}
      className="relative grid gap-6 pl-14 md:grid-cols-2 md:gap-20 md:pl-0"
    >
      <TimelineNode index={index} reached={reached} />

      {/* Copy */}
      <Reveal
        className={`relative md:py-6 ${flip ? "md:order-2 md:pl-6" : "md:pr-6 md:text-right"}`}
        x={flip ? 28 : -28}
        y={0}
      >
        <span
          aria-hidden="true"
          className={`landing-display pointer-events-none absolute -top-6 select-none text-[7rem] leading-none text-white/[0.035] ${
            flip ? "left-0" : "right-0 max-md:left-0"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <p className="relative text-[11px] uppercase tracking-[0.18em] text-[#d4f26a]">
          Step {index + 1}
        </p>
        <h3 className="landing-display relative mt-3 text-3xl leading-tight text-white text-balance">
          {step.title}
        </h3>
        <p className={`${mutedClass} relative mt-3 max-w-md ${flip ? "" : "md:ml-auto"}`}>
          {step.body}
        </p>

        <span
          className={`relative mt-5 inline-flex items-center gap-2 rounded-full border border-[#d4f26a]/25 bg-[#d4f26a]/[0.08] px-3 py-1 font-mono text-[11px] text-[#d4f26a]`}
        >
          <span aria-hidden="true">→</span>
          {step.output}
        </span>
      </Reveal>

      {/* Mock dalam window frame */}
      <Reveal className={flip ? "md:order-1" : undefined} x={flip ? -36 : 36} y={0} delay={0.08}>
        <motion.div
          whileHover={enabled ? { y: -5 } : undefined}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0e0e0e] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:border-[#d4f26a]/30"
        >
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-2.5">
            <span aria-hidden="true" className="flex gap-1.5">
              <i className="size-2 rounded-full bg-white/15" />
              <i className="size-2 rounded-full bg-white/15" />
              <i className="size-2 rounded-full bg-white/15" />
            </span>
            <span className="font-mono text-[10px] text-white/35">{step.file}</span>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 top-10 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
          />
          <div className="relative p-4 sm:p-5">{step.mock}</div>
        </motion.div>
      </Reveal>
    </li>
  );
}

/* ---------- Section ---------- */

export function LandingHowItWorks() {
  const enabled = useLandingMotion();
  const listRef = useRef<HTMLOListElement>(null);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 55%", "end 55%"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });
  const headTop = useTransform(smooth, (v) => `${v * 100}%`);

  return (
    <section
      id="how-it-works"
      className={`${sectionClass} relative mt-28 scroll-mt-32 sm:mt-36`}
    >
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title="From idea to export: fully specified, every step"
          description="Interview, review, generate. The spec stays canonical the whole way."
        />
      </Reveal>

      <div className="relative mt-16">
        {/* Rail + garis progres */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-white/10 via-white/10 to-transparent md:left-1/2"
        >
          <motion.div
            style={{ scaleY: enabled ? smooth : 1 }}
            className="h-full origin-top bg-gradient-to-b from-[#d4f26a]/20 via-[#d4f26a] to-[#d4f26a] shadow-[0_0_14px_rgba(212,242,106,0.55)]"
          />
          {enabled ? (
            <motion.span
              style={{ top: headTop }}
              className="absolute left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eaffa0] shadow-[0_0_16px_4px_rgba(212,242,106,0.7)]"
            />
          ) : null}
        </div>

        <ol ref={listRef} className="relative space-y-20 md:space-y-28">
          {steps.map((step, index) => (
            <Step key={step.title} step={step} index={index} />
          ))}
        </ol>

        {/* Ujung timeline */}
        <motion.div
          className="relative mt-16 flex justify-start pl-14 md:justify-center md:pl-0"
          initial={enabled ? { opacity: 0, y: 16, scale: 0.95 } : false}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.6, ease: landingEase }}
        >
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[#d4f26a]/30 bg-[#0c0c0c] px-4 py-2 font-mono text-xs text-[#d4f26a] shadow-[0_0_40px_-10px_rgba(212,242,106,0.5)]">
            <span aria-hidden="true">✓</span>
            Context ready for your agent
          </span>
        </motion.div>
      </div>
    </section>
  );
}