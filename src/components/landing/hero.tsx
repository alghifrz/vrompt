"use client";

import { motion } from "framer-motion";
import { HeroMock } from "./mocks";
import { landingEase, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { displayClass, mutedClass, sectionClass } from "./styles";

const item = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: landingEase },
  },
};

const tools = ["Cursor", "Qoder", "Claude Code", "AGENTS.md"];

export function LandingHero() {
  const enabled = useLandingMotion();

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <motion.div
        className={`${sectionClass} relative text-center`}
        initial={enabled ? "hidden" : false}
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Badge: Beta + eyebrow digabung jadi satu */}
        <motion.div
          variants={item}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-2 pr-3.5 text-xs text-white/70 backdrop-blur"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4f26a]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4f26a]">
            <motion.span
              className="size-1.5 rounded-full bg-[#d4f26a]"
              animate={enabled ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Beta
          </span>
          From idea to agent context
        </motion.div>

        {/* Headline: italic cuma di kata kunci, bukan seluruh kalimat */}
        <motion.h1
          variants={item}
          className={`${displayClass} mx-auto mt-6 max-w-4xl text-balance`}
        >
          Turn your idea into context your coding agent{" "}
          <span className="italic text-[#d4f26a]">actually follows</span>
        </motion.h1>

        <motion.p
          variants={item}
          className={`${mutedClass} mx-auto mt-5 max-w-xl text-balance`}
        >
          Answer a short interview, review the generated spec, then export
          rules for the tools you already use.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <StartButton>Start a project</StartButton>
          <motion.a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-[#f3f3ee] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            whileTap={enabled ? { scale: 0.97 } : undefined}
          >
            See how it works
            <span aria-hidden>↓</span>
          </motion.a>
        </motion.div>

        {/* Compatibility: jadi chips, bukan teks uppercase polos */}
        <motion.div variants={item} className="mt-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Exports to
          </p>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {tools.map((tool) => (
              <li
                key={tool}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60"
              >
                {tool}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Mock: fade ke bawah biar nyatu sama section berikutnya */}
      <motion.div
        className={`${sectionClass} relative mt-14 max-w-5xl`}
        initial={enabled ? { opacity: 0, y: 48 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8, ease: landingEase }}
      >
        <div className="pointer-events-none absolute inset-x-8 -top-6 h-24 rounded-full bg-[#d4f26a]/10 blur-3xl" />
        <motion.div
          className="[mask-image:linear-gradient(to_bottom,black_75%,transparent)]"
          animate={enabled ? { y: [0, -6, 0] } : undefined}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <HeroMock />
        </motion.div>
      </motion.div>
    </section>
  );
}