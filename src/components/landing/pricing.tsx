"use client";

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { useEffect, useState, type MouseEvent } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { sectionClass } from "./styles";
import { CheckIcon, SectionHeading } from "./ui";

const plans = [
  {
    name: "Free",
    description: "For solo developers turning one idea into a spec.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    popular: false,
    status: "Available now",
    live: true,
    features: [
      "Guided project interview",
      "Typed ProjectSpec",
      "Cursor, Qoder, Claude Code, AGENTS.md",
      "Review before export",
      "ZIP download",
    ],
  },
  {
    name: "Studio",
    description: "For small teams who want the same spec across every agent.",
    monthly: 19,
    yearly: 15,
    cta: "Start a project",
    popular: true,
    status: "Planned",
    live: false,
    features: [
      "Everything in Free",
      "Saved project workspace",
      "Multiple generation targets per export",
      "Spec review as the default path",
      "Early access to upcoming team features",
    ],
  },
  {
    name: "Team",
    description: "For groups that will need shared context later.",
    monthly: 49,
    yearly: 39,
    cta: "Start a project",
    popular: false,
    status: "Planned",
    live: false,
    features: [
      "Everything in Studio",
      "Collaboration is planned, not shipped",
      "Shared specs when team mode lands",
      "Priority on adapter coverage",
      "Same deterministic export pipeline",
    ],
  },
] as const;

type Plan = (typeof plans)[number];
type Cycle = "monthly" | "yearly";

const formatPrice = (value: number) => `$${String(value)}`;

/* ---------- Harga yang berhitung ---------- */

function AnimatedPrice({ value }: { value: number }) {
  const enabled = useLandingMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatPrice(Math.round(v)));

  useEffect(() => {
    if (!enabled) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: landingEase });
    return () => controls.stop();
  }, [value, enabled, mv]);

  return <motion.span>{text}</motion.span>;
}

/* ---------- Toggle billing ---------- */

function CycleToggle({
  cycle,
  onChange,
}: {
  cycle: Cycle;
  onChange: (value: Cycle) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative inline-flex rounded-full border border-white/10 bg-[#101010] p-1"
        role="group"
        aria-label="Billing cycle"
      >
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={cycle === value}
            onClick={() => onChange(value)}
            className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] ${
              cycle === value ? "text-[#14160c]" : "text-white/60 hover:text-white"
            }`}
          >
            {cycle === value ? (
              <motion.span
                layoutId="pricing-cycle"
                className="absolute inset-0 rounded-full bg-[#d4f26a] shadow-[0_0_24px_-4px_rgba(212,242,106,0.7)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
            <span className="relative">{value}</span>
          </button>
        ))}
      </div>

      <motion.span
        animate={{
          opacity: cycle === "yearly" ? 1 : 0.5,
          scale: cycle === "yearly" ? 1 : 0.95,
        }}
        className="rounded-full border border-[#d4f26a]/30 bg-[#d4f26a]/10 px-2.5 py-1 font-mono text-[11px] text-[#d4f26a]"
      >
        Save ~20%
      </motion.span>
    </div>
  );
}

/* ---------- Kartu plan ---------- */

const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
};
const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: landingEase } },
};

function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const enabled = useLandingMotion();
  const price = cycle === "monthly" ? plan.monthly : plan.yearly;

  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const fill = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, rgba(212,242,106,0.1), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      whileHover={enabled ? { y: plan.popular ? -4 : -6 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`relative h-full rounded-[32px] p-px ${
        plan.popular ? "overflow-hidden lg:-my-3" : ""
      }`}
    >
      {/* Border cahaya berputar untuk plan populer */}
      {plan.popular ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] border border-[#d4f26a]/30"
          />
          {enabled ? (
            <motion.div
              aria-hidden="true"
              style={{ x: "-50%", y: "-50%" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              className="absolute left-1/2 top-1/2 h-[200%] w-[200%] [background:conic-gradient(from_0deg,transparent_0_72%,rgba(212,242,106,0.9)_88%,transparent_100%)]"
            />
          ) : null}
        </>
      ) : null}

      <article
        onMouseMove={enabled ? onMove : undefined}
        className={`group relative flex h-full flex-col overflow-hidden rounded-[31px] border p-6 sm:p-7 ${
          plan.popular
            ? "border-transparent bg-[#0d0f08] lg:py-10"
            : "border-white/8 bg-[#101010] transition-colors duration-300 hover:border-white/20"
        }`}
      >
        {plan.popular ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#d4f26a]/[0.12] to-transparent"
          />
        ) : null}

        {enabled ? (
          <motion.div
            aria-hidden="true"
            style={{ background: fill }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        ) : null}

        {/* Header */}
        <div className="relative flex items-center justify-between gap-3">
          <h3 className="landing-display text-3xl text-white">{plan.name}</h3>
          {plan.popular ? (
            <span className="relative overflow-hidden rounded-full bg-[#d4f26a] px-2.5 py-1 text-[11px] font-semibold text-[#14160c]">
              Popular
              {enabled ? (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-6 -skew-x-12 bg-white/60 blur-[2px]"
                  initial={{ left: "-30%" }}
                  animate={{ left: "130%" }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
                />
              ) : null}
            </span>
          ) : null}
        </div>

        <span className="relative mt-3 inline-flex items-center gap-2 self-start font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${
              plan.live ? "animate-pulse bg-[#d4f26a]" : "bg-white/25"
            }`}
          />
          {plan.status}
        </span>

        <p className="relative mt-4 min-h-12 text-sm leading-6 text-[#8a8a84]">
          {plan.description}
        </p>

        {/* Harga */}
        <div className="relative mt-6">
          <p className="flex items-end gap-1.5">
            <span className="landing-display text-6xl leading-none text-white tabular-nums">
              <AnimatedPrice value={price} />
            </span>
            <span className="mb-1.5 text-sm text-white/45">/month</span>
          </p>
          <p className="mt-2 h-4 text-xs text-white/35">
            {plan.monthly === 0
              ? "Free while the MVP is in beta"
              : cycle === "yearly"
                ? `Billed ${formatPrice(plan.yearly * 12)} per year`
                : "Billed monthly"}
          </p>
        </div>

        <div className="relative mt-6">
          <StartButton variant={plan.popular ? "primary" : "ghost"} className="w-full">
            {plan.cta}
          </StartButton>
        </div>

        <div className="relative mt-8 flex items-center gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
            What you will get
          </p>
          <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <motion.ul
          className="relative mt-4 space-y-3 text-sm text-white/75"
          initial={enabled ? "hidden" : false}
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={listContainer}
        >
          {plan.features.map((feature) => (
            <motion.li key={feature} variants={listItem} className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#d4f26a]" />
              <span>{feature}</span>
            </motion.li>
          ))}
        </motion.ul>
      </article>
    </motion.div>
  );
}

/* ---------- Section ---------- */

export function LandingPricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const enabled = useLandingMotion();

  return (
    <section id="pricing" className={`${sectionClass} relative mt-28 scroll-mt-32 sm:mt-36`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-48 -z-10 h-[460px] w-[70%] -translate-x-1/2 rounded-full bg-[#d4f26a]/[0.05] blur-3xl"
      />

      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans while the product stays focused"
            description="The MVP is free to start. Studio and Team describe where this goes. Billing is not required today."
          />
          <CycleToggle cycle={cycle} onChange={setCycle} />
        </div>
      </Reveal>

      <motion.div
        className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch"
        initial={enabled ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={{
              hidden: { opacity: 0, y: 28, scale: 0.97 },
              show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: landingEase } },
            }}
          >
            <PlanCard plan={plan} cycle={cycle} />
          </motion.div>
        ))}
      </motion.div>

      <Reveal delay={0.1}>
        <p className="mt-8 text-center text-sm text-white/35">
          Prices are indicative and may change before billing launches.
        </p>
      </Reveal>
    </section>
  );
}