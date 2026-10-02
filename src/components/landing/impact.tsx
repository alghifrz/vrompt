"use client";

import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, type MouseEvent } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { mutedClass, sectionClass } from "./styles";
import { LogoMark, SectionHeading } from "./ui";

const stats = [
  { value: 1, label: "Source of truth", detail: "ProjectSpec" },
  { value: 4, label: "Coding-agent targets", detail: "Ready to export" },
  { value: 3, label: "Steps to a ZIP", detail: "Interview, review, generate" },
] as const;

/* ---------- Statement: kata menyala mengikuti scroll ---------- */

const segments = [
  { text: "Before Vrompt, project context lived in chat history and half-written READMEs. Now every idea becomes a " },
  { text: "typed spec", highlight: true },
  { text: ", then rules your agents can " },
  { text: "actually follow", highlight: true },
  { text: "." },
] as const;

const words = segments.flatMap((segment) =>
  segment.text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, highlight: "highlight" in segment })),
);
const fullText = segments.map((s) => s.text).join("");

function Word({
  word,
  highlight,
  progress,
  range,
}: {
  word: string;
  highlight: boolean;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span
        style={{ opacity }}
        className={highlight ? "italic text-[#d4f26a]" : undefined}
      >
        {word}
      </motion.span>{" "}
    </>
  );
}

function Statement() {
  const enabled = useLandingMotion();
  const ref = useRef<HTMLQuoteElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 82%", "end 48%"],
  });

  return (
    <div className="relative mt-12">
      <span
        aria-hidden="true"
        className="landing-display pointer-events-none absolute -left-2 -top-14 select-none text-[10rem] leading-none text-[#d4f26a]/[0.12] sm:-left-6"
      >
        “
      </span>

      <blockquote
        ref={ref}
        className="landing-display relative max-w-4xl text-2xl leading-[1.35] text-white sm:text-4xl sm:leading-[1.3]"
      >
        <span className="sr-only">{fullText}</span>
        <span aria-hidden="true">
          {words.map((item, i) => (
            <Word
              key={`${item.word}-${i}`}
              word={item.word}
              highlight={item.highlight}
              progress={enabled ? scrollYProgress : MOTION_DONE}
              range={[i / words.length, Math.min(1, (i + 1.5) / words.length)]}
            />
          ))}
        </span>
      </blockquote>

      <Reveal delay={0.1}>
        <div className="mt-8 flex items-center gap-4">
          <LogoMark compact />
          <div>
            <p className="text-sm font-medium text-white">Why we built Vrompt</p>
            <p className={`${mutedClass} text-sm`}>Interview, review, generate</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// progress "selesai" untuk reduced motion, semua kata langsung terang
const MOTION_DONE = { get: () => 1, on: () => () => {} } as unknown as MotionValue<number>;

/* ---------- Kartu statistik ---------- */

function Pips({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center">
          {i > 0 ? (
            <span className="relative h-px w-6 overflow-hidden bg-white/10">
              <motion.span
                className="absolute inset-0 origin-left bg-[#d4f26a]/70"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: active ? 1 : 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.18, ease: landingEase }}
              />
            </span>
          ) : null}
          <motion.span
            className="size-2.5 rounded-full border"
            initial={{ backgroundColor: "rgba(212,242,106,0)", borderColor: "rgba(255,255,255,0.18)", scale: 0.8 }}
            animate={
              active
                ? {
                    backgroundColor: "#d4f26a",
                    borderColor: "#d4f26a",
                    scale: 1,
                    boxShadow: "0 0 14px rgba(212,242,106,0.6)",
                  }
                : undefined
            }
            transition={{ duration: 0.35, delay: 0.2 + i * 0.18, ease: landingEase }}
          />
        </div>
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  const enabled = useLandingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const active = inView || !enabled;

  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const fill = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, rgba(212,242,106,0.1), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={enabled ? onMove : undefined}
      whileHover={enabled ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative h-full overflow-hidden rounded-[28px] border border-white/8 bg-[#101010] p-6 transition-colors duration-300 hover:border-[#d4f26a]/25 sm:p-7"
    >
      {enabled ? (
        <motion.div
          aria-hidden="true"
          style={{ background: fill }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <motion.p
          className="landing-display text-6xl leading-none text-[#d4f26a] sm:text-7xl"
          initial={enabled ? { opacity: 0, y: 18, filter: "blur(8px)" } : false}
          animate={active ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
          transition={{ duration: 0.7, ease: landingEase }}
        >
          {stat.value}
        </motion.p>
        <div className="pt-3">
          <Pips count={stat.value} active={active} />
        </div>
      </div>

      <div className="relative mt-8 border-t border-white/8 pt-4">
        <p className="text-sm font-medium text-white">{stat.label}</p>
        <p className="mt-1 text-sm text-[#8a8a84]">{stat.detail}</p>
      </div>
    </motion.div>
  );
}

/* ---------- Section ---------- */

export function LandingImpact() {
  const enabled = useLandingMotion();

  return (
    <section className={`${sectionClass} relative mt-28 sm:mt-36`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[380px] w-[70%] -translate-x-1/2 rounded-full bg-[#d4f26a]/[0.04] blur-3xl"
      />

      <Reveal>
        <SectionHeading
          eyebrow="Product shape"
          title="Built for developers who brief agents for a living"
        />
      </Reveal>

      <Statement />

      <motion.div
        className="mt-16 grid gap-4 sm:grid-cols-3"
        initial={enabled ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: landingEase } },
            }}
          >
            <StatCard stat={stat} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}