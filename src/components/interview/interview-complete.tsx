"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { landingEase, useLandingMotion } from "../landing/motion";

export function InterviewComplete({ projectId }: { projectId: string }) {
  const enabled = useLandingMotion();

  return (
    <motion.section
      initial={enabled ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: landingEase }}
      className="sticky bottom-0 z-20 shrink-0 bg-[#0c0c0c]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6"
    >
      <div className="rounded-[22px] bg-gradient-to-b from-[#d4f26a]/40 via-white/10 to-white/[0.04] p-px">
        <div className="relative overflow-hidden rounded-[21px] bg-[#0f110a] p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#d4f26a]/15 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#d4f26a]/30 bg-[#d4f26a]/10 text-[#d4f26a]">
                {enabled ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl bg-[#d4f26a]/25"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                ) : null}
                <svg viewBox="0 0 24 24" className="relative size-5" fill="none" aria-hidden="true">
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={enabled ? { pathLength: 0 } : false}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: landingEase }}
                  />
                </svg>
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4f26a]">
                  Next up: review
                </p>
                <h2 className="landing-display mt-1.5 text-2xl text-white">
                  Interview complete
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
                  Check names, features, and rules next. Then generate the ZIP.
                </p>
              </div>
            </div>

            <Link
              href={`/review/${projectId}`}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#d4f26a] px-5 py-3 text-sm font-semibold text-[#14160c] shadow-[0_10px_40px_-10px_rgba(212,242,106,0.6)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#e2f88a] hover:shadow-[0_14px_50px_-10px_rgba(212,242,106,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a]"
            >
              Review specification
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}