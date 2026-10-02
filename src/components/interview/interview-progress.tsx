"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { InterviewViewModel } from "../../lib/interview/view-model";
import { useLandingMotion } from "../landing/motion";

const STATE_LABEL: Record<string, string> = {
  complete: "Complete",
  current: "Current",
  skipped: "Skipped",
  upcoming: "Upcoming",
};

function StateIcon({ state }: { state: string }) {
  if (state === "complete") {
    return (
      <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "current") {
    return (
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
      />
    );
  }
  if (state === "skipped") {
    return (
      <span aria-hidden="true" className="h-px w-2 bg-current" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="size-1.5 rounded-full border border-current"
    />
  );
}

const chipClass: Record<string, string> = {
  complete: "border-[#d4f26a]/25 bg-[#d4f26a]/[0.07] text-[#d4f26a]/90",
  current: "border-transparent font-semibold text-[#14160c]",
  skipped: "border-transparent text-white/30 line-through",
  upcoming: "border-white/10 text-white/40",
};

export function InterviewProgress({ view }: { view: InterviewViewModel }) {
  const enabled = useLandingMotion();
  const scrollerRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);
  const currentId = view.progress.phases.find((p) => p.state === "current")?.id;

  // fase aktif selalu terlihat di tengah saat list di-scroll horizontal
  useEffect(() => {
    const scroller = scrollerRef.current;
    const el = currentRef.current;
    if (!scroller || !el) return;
    const left = el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2;
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ left, behavior: "smooth" });
    } else {
      scroller.scrollLeft = left;
    }
  }, [currentId]);

  return (
    <nav
      aria-label="Interview progress"
      className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-6"
    >
      <ol
        ref={scrollerRef}
        className="relative flex items-center overflow-x-auto pb-1 text-xs [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {view.progress.phases.map((phase, index) => {
          const current = phase.state === "current";
          const last = index === view.progress.phases.length - 1;

          return (
            <li
              key={phase.id}
              ref={current ? currentRef : undefined}
              className="flex shrink-0 items-center"
            >
              <span
                className={`relative isolate inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors duration-300 ${
                  chipClass[phase.state] ?? chipClass.upcoming
                } ${current && !enabled ? "bg-[#d4f26a]" : ""}`}
              >
                {current && enabled ? (
                  <motion.span
                    aria-hidden="true"
                    layoutId="interview-phase-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[#d4f26a] shadow-[0_0_20px_-4px_rgba(212,242,106,0.7)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span aria-hidden="true" className="grid size-3 place-items-center">
                  <StateIcon state={phase.state} />
                </span>
                {phase.label}
                <span className="sr-only">, {STATE_LABEL[phase.state]}</span>
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={`mx-1.5 h-px w-4 ${
                    phase.state === "complete" ? "bg-[#d4f26a]/50" : "bg-white/10"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}