"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { scrollToLandingSection } from "./nav-scroll";
import { StartButton } from "./start-button";
import { displayClass, mutedClass, navItems, sectionClass } from "./styles";
import { LogoMark } from "./ui";

/* ---------- Mini terminal ---------- */

const COMMAND = "vrompt export --targets all";
const OUTPUT = [
  "ProjectSpec validated",
  ".cursor/rules/project.mdc",
  ".qoder/rules/project.md",
  "CLAUDE.md",
  "AGENTS.md",
] as const;

function Terminal() {
  const enabled = useLandingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [typed, setTyped] = useState(enabled ? 0 : COMMAND.length);
  const [shown, setShown] = useState(enabled ? 0 : OUTPUT.length);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!enabled || !inView) return;

    const timers: number[] = [];
    let i = 0;
    setTyped(0);
    setShown(0);

    const typing = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= COMMAND.length) window.clearInterval(typing);
    }, 42);

    const startOutput = COMMAND.length * 42 + 450;
    OUTPUT.forEach((_, n) => {
      timers.push(window.setTimeout(() => setShown(n + 1), startOutput + n * 380));
    });
    // selesai -> jeda sebentar -> ulang
    timers.push(
      window.setTimeout(() => setCycle((c) => c + 1), startOutput + OUTPUT.length * 380 + 4200),
    );

    return () => {
      window.clearInterval(typing);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [enabled, inView, cycle]);

  const done = shown >= OUTPUT.length;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
    >
      <span className="sr-only">
        Running vrompt export writes the Cursor, Qoder, Claude Code, and AGENTS.md files
        into a ZIP.
      </span>

      <div aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-2.5">
          <span className="flex gap-1.5">
            <i className="size-2 rounded-full bg-white/15" />
            <i className="size-2 rounded-full bg-white/15" />
            <i className="size-2 rounded-full bg-white/15" />
          </span>
          <span className="font-mono text-[10px] text-white/35">~/my-project</span>
        </div>

        <div className="min-h-[248px] space-y-1.5 p-4 font-mono text-[12px] leading-5 sm:p-5">
          <p className="text-white/85">
            <span className="text-[#d4f26a]">$</span> {COMMAND.slice(0, typed)}
            {typed < COMMAND.length ? (
              <motion.i
                className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[#d4f26a]"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </p>

          {OUTPUT.slice(0, shown).map((line) => (
            <motion.p
              key={line}
              initial={enabled ? { opacity: 0, x: -6 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 text-white/55"
            >
              <span className="text-[#d4f26a]">✓</span>
              {line}
            </motion.p>
          ))}

          <AnimatePresence>
            {done ? (
              <motion.p
                initial={enabled ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="!mt-4 inline-flex items-center gap-2 rounded-full border border-[#d4f26a]/30 bg-[#d4f26a]/10 px-3 py-1 text-[11px] text-[#d4f26a]"
              >
                ↓ vrompt-export.zip · 4 files
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- CTA ---------- */

const ctaItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: landingEase } },
};

const assurances = ["Free in beta", "No billing", "Local export"] as const;

export function LandingCta() {
  const enabled = useLandingMotion();
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(520px circle at ${mx}px ${my}px, rgba(212,242,106,0.11), transparent 65%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <section className={`${sectionClass} mt-28 sm:mt-36`}>
      <Reveal>
        <div
          onMouseMove={enabled ? onMove : undefined}
          className="group relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0e0e0e] px-6 py-12 sm:px-10 sm:py-16 lg:px-14"
        >
          {/* dot grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
          />
          {/* glow berdenyut */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-32 size-[420px] rounded-full bg-[#d4f26a]/15 blur-3xl"
            animate={enabled ? { opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] } : undefined}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* cursor spotlight */}
          {enabled ? (
            <motion.div
              aria-hidden="true"
              style={{ background: glow }}
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#d4f26a]/50 to-transparent"
          />

          <motion.div
            className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14"
            initial={enabled ? "hidden" : false}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
          >
            <div>
              <motion.p
                variants={ctaItem}
                className="font-mono text-xs uppercase tracking-[0.2em] text-[#d4f26a]"
              >
                Ready when you are
              </motion.p>
              <motion.h2
                variants={ctaItem}
                className={`${displayClass} mt-4 max-w-xl text-balance`}
              >
                Ship every project with a{" "}
                <span className="italic text-[#d4f26a]">real spec</span>
              </motion.h2>
              <motion.p variants={ctaItem} className={`${mutedClass} mt-4 max-w-md`}>
                See the interview, the ProjectSpec, and the generated agent files in
                one continuous workflow.
              </motion.p>

              <motion.div
                variants={ctaItem}
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4"
              >
                <StartButton>Start a project</StartButton>
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
                  {assurances.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="text-[#d4f26a]">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.div variants={ctaItem}>
              <motion.div
                animate={enabled ? { y: [0, -6, 0] } : undefined}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <Terminal />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Footer ---------- */

const targets = ["AGENTS.md", "Cursor", "Qoder", "Claude Code"] as const;

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (!href.startsWith("#")) {
          return;
        }
        event.preventDefault();
        scrollToLandingSection(href);
      }}
      className="group inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a]"
    >
      <span
        aria-hidden="true"
        className="-ml-3 w-3 text-[#d4f26a] opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:opacity-100"
      >
        →
      </span>
      {children}
    </a>
  );
}

export function LandingFooter() {
  const enabled = useLandingMotion();

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-white/8">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4f26a]/40 to-transparent"
      />

      <motion.div
        className={`${sectionClass} grid gap-10 pt-14 md:grid-cols-4`}
        initial={enabled ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.div variants={ctaItem} className="md:col-span-2">
          <LogoMark />
          <p className={`${mutedClass} mt-4 max-w-sm`}>
            Your project-context layer for coding agents. Interview the idea, lock
            the spec, export the files.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/50">
            <motion.span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#d4f26a]"
              animate={enabled ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Public beta
          </span>
        </motion.div>

        <motion.nav variants={ctaItem} aria-label="Footer">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
            Quick menu
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link
                href="/"
                className="group inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a]"
              >
                <span
                  aria-hidden="true"
                  className="-ml-3 w-3 text-[#d4f26a] opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:opacity-100"
                >
                  →
                </span>
                Home
              </Link>
            </li>
            {navItems.map((item) => (
              <li key={item.href}>
                <FooterLink href={item.href}>{item.label}</FooterLink>
              </li>
            ))}
          </ul>
        </motion.nav>

        <motion.div variants={ctaItem}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
            Exports to
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {targets.map((target) => (
              <li
                key={target}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60 transition-colors hover:border-[#d4f26a]/30 hover:text-white"
              >
                {target}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-white/30">
            Interview, review, generate
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom bar */}
      <div
        className={`${sectionClass} mt-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center`}
      >
        <p className="text-xs text-white/35">
          © {new Date().getFullYear()} Vrompt. All rights reserved.
        </p>
        <motion.button
          type="button"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: enabled ? "smooth" : "auto" })
          }
          whileHover={enabled ? { y: -2 } : undefined}
          whileTap={enabled ? { scale: 0.96 } : undefined}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/60 transition-colors hover:border-[#d4f26a]/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
        >
          Back to top
          <span aria-hidden="true">↑</span>
        </motion.button>
      </div>

      {/* Wordmark raksasa, terpotong dan memudar */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none relative mt-6 select-none overflow-hidden"
        initial={enabled ? { opacity: 0, y: 40 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: landingEase }}
      >
        <p className="landing-display -mb-[0.18em] text-center text-[clamp(5rem,24vw,18rem)] italic leading-[0.9] [background-image:linear-gradient(to_bottom,rgba(212,242,106,0.22),rgba(255,255,255,0.03)_60%,transparent)] bg-clip-text text-transparent">
          vrompt
        </p>
      </motion.div>
    </footer>
  );
}