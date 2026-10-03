"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { useLandingMotion } from "../landing/motion";
import {
  displayClass,
  ghostButtonClass,
  landingShellClass,
  mutedClass,
} from "../landing/styles";
import { LogoMark } from "../landing/ui";

const tools = ["Cursor", "Qoder", "Claude Code", "AGENTS.md"] as const;

const flow = [
  { label: "Interview", detail: "Answer focused questions" },
  { label: "Review", detail: "Check the typed ProjectSpec" },
  { label: "Generate", detail: "Export rules as a ZIP" },
] as const;

/* ---------- Preview alur yang berputar ---------- */

function FlowPreview() {
  const enabled = useLandingMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % flow.length), 2200);
    return () => window.clearInterval(id);
  }, [enabled]);

  return (
    <ol
      className="relative space-y-2"
      aria-label="Interview, review, generate"
    >
      {flow.map((f, i) => {
        const current = i === step && enabled;
        const done = enabled && i < step;
        return (
          <li
            key={f.label}
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/8 bg-[#101010]/80 px-4 py-3 backdrop-blur"
          >
            {current ? (
              <motion.span
                aria-hidden="true"
                layoutId="auth-flow-active"
                className="absolute inset-0 border border-[#d4f26a]/35 bg-gradient-to-r from-[#d4f26a]/[0.12] to-transparent"
                style={{ borderRadius: 16 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <motion.span
              aria-hidden="true"
              animate={{
                backgroundColor: current || done ? "#d4f26a" : "rgba(255,255,255,0)",
                borderColor: current || done ? "#d4f26a" : "rgba(255,255,255,0.15)",
                color: current || done ? "#0c0c0c" : "rgba(255,255,255,0.4)",
              }}
              className="relative grid size-8 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold"
            >
              {done ? "✓" : String(i + 1).padStart(2, "0")}
            </motion.span>
            <span className="relative">
              <span
                className={`block text-sm font-medium transition-colors ${
                  current ? "text-white" : "text-white/70"
                }`}
              >
                {f.label}
              </span>
              <span className="block text-xs text-white/40">{f.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Toggle Sign in / Create account ---------- */

function ModeToggle({ isSignUp }: { isSignUp: boolean }) {
  const tabs = [
    { href: "/sign-in", label: "Sign in", active: !isSignUp },
    { href: "/sign-up", label: "Create account", active: isSignUp },
  ] as const;

  return (
    <nav
      aria-label="Authentication mode"
      className="inline-flex rounded-full border border-white/10 bg-[#101010] p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] ${
            tab.active
              ? "bg-[#d4f26a] text-[#14160c] shadow-[0_0_20px_-4px_rgba(212,242,106,0.7)]"
              : "text-white/55 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/* ---------- Kartu auth ---------- */

function AuthCard({
  clerkEnabled,
  isSignUp,
}: {
  clerkEnabled: boolean;
  isSignUp: boolean;
}) {
  const enabled = useLandingMotion();
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(212,242,106,0.1), transparent 65%)`;

  function onMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[#d4f26a]/[0.07] blur-3xl"
      />

      {/* border gradient */}
      <div className="rounded-[34px] bg-gradient-to-b from-white/20 via-white/[0.06] to-[#d4f26a]/25 p-px">
        <section
          onMouseMove={enabled ? onMove : undefined}
          className="group relative overflow-hidden rounded-[33px] bg-[#121212] p-5 sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_70%)]"
          />
          {enabled ? (
            <motion.div
              aria-hidden="true"
              style={{ background: glow }}
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#d4f26a]/50 to-transparent"
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <ModeToggle isSignUp={isSignUp} />
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/35">
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-[#d4f26a]" />
              Free in beta
            </span>
          </div>

          <div className="relative mt-6">
            {clerkEnabled ? (
              <div className="flex justify-center">
                {isSignUp ? (
                  <SignUp
                    key="sign-up"
                    routing="path"
                    path="/sign-up"
                    signInUrl="/sign-in"
                    fallbackRedirectUrl="/start"
                    forceRedirectUrl="/start"
                  />
                ) : (
                  <SignIn
                    key="sign-in"
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up"
                    fallbackRedirectUrl="/start"
                    forceRedirectUrl="/start"
                  />
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
                <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-300/70" />
                  Authentication
                </p>
                <p className={`${mutedClass} mt-3 text-sm`}>
                  Authentication is not configured in this environment. Add Clerk
                  keys before starting a project. Secret values are never shown
                  here.
                </p>
                <Link
                  href="/"
                  className="group/back mt-5 inline-flex items-center gap-1.5 text-sm text-[#d4f26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a]"
                >
                  <span aria-hidden="true" className="transition-transform group-hover/back:-translate-x-0.5">
                    ←
                  </span>
                  Back to Vrompt
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Screen ---------- */

export function SignInScreen({
  clerkEnabled,
  mode = "sign-in",
}: {
  clerkEnabled: boolean;
  mode?: "sign-in" | "sign-up";
}) {
  const isSignUp = mode === "sign-up";

  return (
    <div className={`${landingShellClass} relative flex min-h-full flex-1 flex-col overflow-hidden`}>
      <div className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[460px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]"
      />

      <header className="relative z-10 px-5 pt-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
          >
            <LogoMark />
          </Link>
          <Link
            href="/"
            className={`${ghostButtonClass} group inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm`}
          >
            <span aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Back to home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-20 lg:py-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#d4f26a]">
            <span
              aria-hidden="true"
              className="size-1.5 animate-pulse rounded-full bg-[#d4f26a]"
            />
            Interview, review, generate
          </p>

          <h1 className={`${displayClass} mt-5 max-w-lg text-balance`}>
            {isSignUp ? (
              <>
                Start with a <span className="italic text-[#d4f26a]">real spec</span>
              </>
            ) : (
              <>
                Welcome <span className="italic text-[#d4f26a]">back</span>
              </>
            )}
          </h1>

          <p className={`${mutedClass} mt-4 max-w-md text-balance`}>
            {isSignUp
              ? "Create an account to start a structured interview and keep your project specification."
              : "Continue a project or start a new interview. Your spec stays the source of truth for every coding-agent export."}
          </p>

          <div className="mt-8 max-w-md">
            <FlowPreview />
          </div>

          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
              Exports to
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tools.map((tool) => (
                <li
                  key={tool}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-[#d4f26a]/30 hover:text-white"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AuthCard clerkEnabled={clerkEnabled} isSignUp={isSignUp} />
      </main>
    </div>
  );
}