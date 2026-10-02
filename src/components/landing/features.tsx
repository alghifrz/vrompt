"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ExportMock, InterviewMock, RulesMock, SpecMock } from "./mocks";
import { landingEase, Reveal, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { mutedClass, sectionClass } from "./styles";
import { SectionHeading } from "./ui";

const features = [
  {
    id: "interview",
    label: "Guided interview",
    title: "Progressive questions, not a giant form",
    body: "Each phase asks for the next useful detail (idea, users, stack, constraints) so the spec fills in without dumping everything into one prompt.",
    mock: <InterviewMock />,
  },
  {
    id: "spec",
    label: "Typed ProjectSpec",
    title: "A reviewable contract before any file is generated",
    body: "The spec is validated before generation. If something is missing, you see it in review instead of discovering it inside an agent chat.",
    mock: <SpecMock />,
  },
  {
    id: "adapters",
    label: "Tool adapters",
    title: "The same spec, formatted for each agent",
    body: "Cursor rules, Qoder rules, Claude Code files, and AGENTS.md are rendered deterministically. Tool-specific behavior stays inside adapters.",
    mock: <RulesMock />,
  },
  {
    id: "export",
    label: "Review and export",
    title: "Preview the files, then download a ZIP",
    body: "Choose the targets you need, inspect the output, and export under vrompt-export/. Generation is local and repeatable from the saved spec.",
    mock: <ExportMock />,
  },
] as const;

type FeatureId = (typeof features)[number]["id"];

const AUTOPLAY_SECONDS = 7;

const panelVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36, scale: 0.98, filter: "blur(6px)" }),
  center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36, scale: 0.98, filter: "blur(6px)" }),
};

export function LandingFeatures() {
  const enabled = useLandingMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Partial<Record<FeatureId, HTMLButtonElement | null>>>({});
  const inView = useInView(sectionRef, { margin: "-20% 0px -20% 0px" });

  const [activeId, setActiveId] = useState<FeatureId>("interview");
  const [direction, setDirection] = useState(1);
  const [autoplay, setAutoplay] = useState(true);
  const [hovering, setHovering] = useState(false);

  const progress = useMotionValue(0);
  const activeIndex = features.findIndex((f) => f.id === activeId);
  const active = features[activeIndex] ?? features[0];
  const playing = enabled && autoplay && inView && !hovering;

  // Spotlight panel
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(520px circle at ${mx}px ${my}px, rgba(212,242,106,0.10), transparent 65%)`;

  function onPanelMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  function select(index: number, manual: boolean) {
    const next = features[index];
    if (!next) return;
    setDirection(index >= activeIndex ? 1 : -1);
    setActiveId(next.id);
    if (manual) {
      setAutoplay(false);
      progress.set(1);
    } else {
      progress.set(0);
    }
  }

  // Autoplay: lanjut dari progress terakhir, pause saat hover / keluar viewport
  useEffect(() => {
    if (!playing) return;
    const remaining = Math.max(0.05, 1 - progress.get());
    const controls = animate(progress, 1, {
      duration: AUTOPLAY_SECONDS * remaining,
      ease: "linear",
      onComplete: () => {
        const next = features[(activeIndex + 1) % features.length];
        if (!next) return;
        setDirection(1);
        setActiveId(next.id);
        progress.set(0);
      },
    });
    return () => controls.stop();
  }, [playing, activeIndex, progress]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = features.length - 1;
    let next = activeIndex;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = activeIndex === last ? 0 : activeIndex + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = activeIndex === 0 ? last : activeIndex - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    select(next, true);
    const nextFeature = features[next];
    if (nextFeature) tabRefs.current[nextFeature.id]?.focus();
  }

  return (
    <section
      ref={sectionRef}
      id="features"
      className={`${sectionClass} mt-28 scroll-mt-32 sm:mt-36`}
    >
      <Reveal>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Features"
            title="Catch gaps before they reach your coding agent"
            description="Every project is interviewed, validated, and reviewed before configuration is exported."
          />
          <StartButton variant="ghost">Start a project</StartButton>
        </div>
      </Reveal>

      <div
        className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* ---------- Tabs (accordion vertikal) ---------- */}
        <div
          role="tablist"
          aria-label="Product features"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex flex-col gap-2"
        >
          {features.map((feature, index) => {
            const selected = feature.id === active.id;
            return (
              <div
                key={feature.id}
                role="presentation"
                className={`relative overflow-hidden rounded-2xl border transition-colors duration-300 ${
                  selected
                    ? "border-[#d4f26a]/25"
                    : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                {selected ? (
                  <motion.span
                    aria-hidden="true"
                    layoutId="feature-active-bg"
                    className="absolute inset-0 bg-gradient-to-br from-[#d4f26a]/[0.09] to-transparent"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                ) : null}

                <button
                  type="button"
                  role="tab"
                  id={`feature-tab-${feature.id}`}
                  aria-selected={selected}
                  aria-controls="feature-panel"
                  tabIndex={selected ? 0 : -1}
                  ref={(node) => {
                    tabRefs.current[feature.id] = node;
                  }}
                  onClick={() => select(index, true)}
                  className="group relative flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#d4f26a]"
                >
                  <span
                    className={`font-mono text-xs transition-colors ${
                      selected ? "text-[#d4f26a]" : "text-white/30 group-hover:text-white/60"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 text-[15px] font-medium transition-colors ${
                      selected ? "text-white" : "text-white/55 group-hover:text-white"
                    }`}
                  >
                    {feature.label}
                  </span>
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: selected ? 90 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={selected ? "text-[#d4f26a]" : "text-white/25"}
                  >
                    →
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {selected ? (
                    <motion.div
                      key="content"
                      initial={enabled ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={enabled ? { height: 0, opacity: 0 } : undefined}
                      transition={{ duration: 0.38, ease: landingEase }}
                      className="relative overflow-hidden"
                    >
                      <div className="pb-6 pl-[3.75rem] pr-6">
                        <h3 className="landing-display text-2xl leading-snug text-white text-balance">
                          {feature.title}
                        </h3>
                        <p className={`${mutedClass} mt-3 text-sm`}>{feature.body}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Progress bar auto-play */}
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5"
                  >
                    <motion.span
                      className="block h-full origin-left bg-[#d4f26a]"
                      style={{ scaleX: autoplay && enabled ? progress : 1 }}
                    />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* ---------- Panel preview ---------- */}
        <div
          role="tabpanel"
          id="feature-panel"
          aria-labelledby={`feature-tab-${active.id}`}
          onMouseMove={enabled ? onPanelMove : undefined}
          className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0e0e0e] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] lg:sticky lg:top-28"
        >
          {/* dot grid + fade */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          />
          {/* cursor spotlight */}
          {enabled ? (
            <motion.div
              aria-hidden="true"
              style={{ background: glow }}
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}

          {/* window chrome */}
          <div className="relative flex items-center gap-3 border-b border-white/8 px-5 py-3">
            <span aria-hidden="true" className="flex gap-1.5">
              <i className="size-2.5 rounded-full bg-white/15" />
              <i className="size-2.5 rounded-full bg-white/15" />
              <i className="size-2.5 rounded-full bg-white/15" />
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={active.id}
                initial={enabled ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={enabled ? { opacity: 0, y: -4 } : undefined}
                transition={{ duration: 0.18 }}
                className="font-mono text-[11px] text-white/40"
              >
                vrompt / {active.id}
              </motion.span>
            </AnimatePresence>
            <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/30">
              <span
                className={`size-1.5 rounded-full ${
                  playing ? "animate-pulse bg-[#d4f26a]" : "bg-white/20"
                }`}
              />
              {playing ? "Auto" : "Paused"}
            </span>
          </div>

          {/* mock */}
          <div className="relative min-h-[360px] p-5 sm:min-h-[440px] sm:p-8">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={active.id}
                custom={direction}
                variants={panelVariants}
                initial={enabled ? "enter" : false}
                animate="center"
                exit={enabled ? "exit" : undefined}
                transition={{ duration: 0.35, ease: landingEase }}
              >
                {active.mock}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}