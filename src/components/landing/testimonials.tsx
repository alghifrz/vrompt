"use client";

import { motion } from "framer-motion";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { sectionClass } from "./styles";
import { SectionHeading } from "./ui";

const testimonials = [
  {
    quote:
      "I finally have a single place to reason about what the agent is allowed to build.",
    name: "Aisha Rahman",
    role: "Platform engineer",
  },
  {
    quote:
      "The interview replaced the tribal knowledge I used to paste into every new chat.",
    name: "Noah Keller",
    role: "Engineering lead",
  },
  {
    quote:
      "We were exporting Cursor and Claude rules from the same spec on the first afternoon.",
    name: "Maya Chen",
    role: "Founding engineer",
  },
  {
    quote:
      "It feels like infrastructure for prompts. The spec stays, the files are just renders.",
    name: "Luis Ortega",
    role: "Staff developer",
  },
  {
    quote:
      "Reviewing changes is faster because the context is already structured.",
    name: "Priya Nair",
    role: "Product engineer",
  },
  {
    quote:
      "I stopped discovering missing constraints after the agent had already written a feature.",
    name: "Jonas Berg",
    role: "Indie hacker",
  },
  {
    quote:
      "AGENTS.md, Cursor, and Qoder no longer drift. That alone changed how I start projects.",
    name: "Elena Voss",
    role: "Design engineer",
  },
  {
    quote:
      "The ZIP is boring in the best way. Same input, same output, no ceremony.",
    name: "Chris Adeyemi",
    role: "Frontend lead",
  },
] as const;

type Testimonial = (typeof testimonials)[number];

/* ---------- Avatar inisial ---------- */

// gradient tipis berbeda per orang, tetap di palet lime/netral
const avatarTones = [
  "from-[#d4f26a]/35 to-[#d4f26a]/5",
  "from-white/25 to-white/5",
  "from-[#a8d94a]/35 to-[#a8d94a]/5",
  "from-[#eaffa0]/30 to-[#eaffa0]/5",
] as const;

function Avatar({ name, tone }: { name: string; tone: number }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ring-1 ring-inset ring-white/15 text-[11px] font-semibold text-white ${
        avatarTones[tone % avatarTones.length]
      }`}
    >
      {initials}
    </span>
  );
}

/* ---------- Kartu ---------- */

function TestimonialCard({
  quote,
  name,
  role,
  tone,
}: Testimonial & { tone: number }) {
  const enabled = useLandingMotion();

  return (
    <motion.figure
      className="group/card relative w-[264px] shrink-0 rounded-2xl border border-white/8 bg-[#101010] p-4 transition-colors duration-300 hover:border-[#d4f26a]/30"
      whileHover={enabled ? { y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <span
        aria-hidden="true"
        className="landing-display absolute right-3.5 top-1 select-none text-4xl leading-none text-[#d4f26a]/20 transition-colors duration-300 group-hover/card:text-[#d4f26a]/50"
      >
        “
      </span>
      <blockquote className="relative text-[13px] leading-[1.6] text-white/75">
        {quote}
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5">
        <Avatar name={name} tone={tone} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-white">
            {name}
          </span>
          <span className="block truncate text-[11px] text-[#8a8a84]">{role}</span>
        </span>
      </figcaption>
    </motion.figure>
  );
}

/* ---------- Marquee ---------- */

function MarqueeRow({
  items,
  reverse = false,
  offset = 0,
}: {
  items: readonly Testimonial[];
  reverse?: boolean;
  offset?: number;
}) {
  return (
    <div className="group overflow-hidden py-1">
      <div
        className={`flex w-max gap-3 group-hover:[animation-play-state:paused] ${
          reverse ? "landing-marquee-reverse" : "landing-marquee"
        }`}
      >
        {[0, 1].map((copy) => (
          // salinan kedua cuma buat loop mulus, disembunyikan dari screen reader
          <div key={copy} className="flex gap-3" aria-hidden={copy === 1}>
            {items.map((item, i) => (
              <TestimonialCard key={item.name} {...item} tone={i + offset} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Section ---------- */

export function LandingTestimonials() {
  const enabled = useLandingMotion();
  const first = testimonials.slice(0, 4);
  const second = testimonials.slice(4);

  return (
    <section
      id="testimonials"
      className={`${sectionClass} relative mt-28 max-w-4xl scroll-mt-32 sm:mt-36`}
    >
      <Reveal>
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by people who ship with coding agents"
          description="Representative voices for the workflow Vrompt is built to support."
        />
      </Reveal>

      <motion.div
        className="relative mt-10"
        initial={enabled ? { opacity: 0, y: 24 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: landingEase }}
      >
        {/* glow di belakang panel */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-1/2 -z-10 h-40 -translate-y-1/2 rounded-full bg-[#d4f26a]/[0.06] blur-3xl"
        />

        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0e0e0e] py-4">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          {enabled ? (
            <div className="space-y-3 [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)]">
              <MarqueeRow items={first} />
              <MarqueeRow items={second} reverse offset={2} />
            </div>
          ) : (
            // reduced motion: grid statis, nggak ada yang bergerak
            <ul className="grid gap-3 px-4 sm:grid-cols-2">
              {testimonials.map((item, i) => (
                <li key={item.name} className="[&>figure]:w-full">
                  <TestimonialCard {...item} tone={i} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </section>
  );
}