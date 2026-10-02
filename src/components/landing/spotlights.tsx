"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { ExportMock, InterviewMock, SpecMock } from "./mocks";
import { landingEase, Reveal, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { eyebrowClass, mutedClass, sectionClass, sectionTitleClass } from "./styles";

const spotlights: readonly {
  label: string;
  title: string;
  body: string;
  points: readonly string[];
  mock: ReactNode;
  reverse?: boolean;
}[] = [
  {
    label: "Guided interview",
    title: "Stop briefing agents from a blank chat",
    body: "Answer focused questions about users, stack, and constraints. Vrompt turns the conversation into a typed ProjectSpec instead of another disposable prompt.",
    points: ["Focused questions", "Typed ProjectSpec", "No blank-page prompting"],
    mock: <InterviewMock />,
  },
  {
    label: "Canonical specification",
    title: "One source of truth for every generated file",
    body: "Markdown, rules, and ZIP exports are derived from the spec. Edit the spec first. The adapters follow, so Cursor and Claude Code do not drift apart.",
    points: ["Edit once", "Adapters follow", "Zero drift between tools"],
    mock: <SpecMock />,
    reverse: true,
  },
  {
    label: "Review before export",
    title: "See exactly what your agents will receive",
    body: "Preview target files, keep what is ready, and download a ZIP. Nothing is written into a repo until you choose to export it.",
    points: ["Preview every file", "Pick what to keep", "Nothing written until you export"],
    mock: <ExportMock />,
  },
];

/* ---------- Mock dengan 3D tilt + cursor spotlight ---------- */
function TiltFrame({ children, reverse }: { children: ReactNode; reverse?: boolean }) {
  const enabled = useLandingMotion();
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 160, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 160, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(420px circle at ${useTransform(mx, [0, 1], ["0%", "100%"])} ${useTransform(my, [0, 1], ["0%", "100%"])}, rgba(212,242,106,0.14), transparent 60%)`;
  const glowOpacity = useMotionValue(0);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
    glowOpacity.set(0);
  }

  // parallax halus berdasarkan posisi scroll
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const parallax = useTransform(scrollYProgress, [0, 1], [reverse ? -24 : 24, reverse ? 24 : -24]);

  if (!enabled) return <div>{children}</div>;

  return (
    <motion.div style={{ y: parallax }} className="[perspective:1200px]">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => glowOpacity.set(1)}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[#d4f26a]/[0.06] blur-3xl" />
        {children}
        <motion.div
          aria-hidden="true"
          style={{ background: glow, opacity: glowOpacity }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen transition-opacity duration-300"
        />
      </motion.div>
    </motion.div>
  );
}

/* ---------- Teks dengan stagger ---------- */
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: landingEase } },
};

function SpotlightCopy({
  item,
  index,
}: {
  item: (typeof spotlights)[number];
  index: number;
}) {
  const enabled = useLandingMotion();

  return (
    <motion.div
      initial={enabled ? "hidden" : false}
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      variants={textContainer}
    >
      <motion.div variants={textItem} className="flex items-center gap-3">
        <span className="font-mono text-xs text-[#d4f26a]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-[#d4f26a]/60 to-transparent" />
        <p className={eyebrowClass}>{item.label}</p>
      </motion.div>

      <motion.h2 variants={textItem} className={`${sectionTitleClass} mt-4 text-balance`}>
        {item.title}
      </motion.h2>

      <motion.p variants={textItem} className={`${mutedClass} mt-4 max-w-lg`}>
        {item.body}
      </motion.p>

      <ul className="mt-6 space-y-2.5">
        {item.points.map((point) => (
          <motion.li
            key={point}
            variants={textItem}
            className="flex items-center gap-3 text-sm text-[#d6d6d0]"
          >
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-[#d4f26a]/15 text-[10px] text-[#d4f26a]"
            >
              ✓
            </span>
            {point}
          </motion.li>
        ))}
      </ul>

      <motion.div variants={textItem} className="mt-8">
        <StartButton>Start a project</StartButton>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Section ---------- */
export function LandingSpotlights() {
  return (
    <section className="mt-28 space-y-28 sm:mt-36 sm:space-y-40">
      {spotlights.map((item, index) => (
        <div
          key={item.label}
          className={`${sectionClass} grid items-center gap-10 lg:grid-cols-2 lg:gap-20`}
        >
          <Reveal
            className={item.reverse ? "lg:order-2" : undefined}
            x={item.reverse ? 36 : -36}
            y={0}
          >
            <TiltFrame reverse={item.reverse}>{item.mock}</TiltFrame>
          </Reveal>

          <div className={item.reverse ? "lg:order-1" : undefined}>
            <SpotlightCopy item={item} index={index} />
          </div>
        </div>
      ))}
    </section>
  );
}