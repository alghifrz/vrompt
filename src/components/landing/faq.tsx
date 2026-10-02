"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent } from "react";
import { Reveal, landingEase, useLandingMotion } from "./motion";
import { StartButton } from "./start-button";
import { mutedClass, sectionClass } from "./styles";
import { SectionHeading } from "./ui";

const faqs = [
  {
    id: "projects",
    category: "General",
    question: "What kind of projects is Vrompt for?",
    answer:
      "Any project you would brief to Cursor, Qoder, Claude Code, or an AGENTS.md file. It is especially useful when the idea is clear enough to interview, but not yet specified.",
  },
  {
    id: "free",
    category: "Plans",
    question: "Is Vrompt free to use?",
    answer:
      "Yes. You can start a project, complete the interview, review the spec, generate target files, and export a ZIP without a paid plan. Studio and Team are planned, and billing is deferred.",
  },
  {
    id: "agents",
    category: "Export",
    question: "Which coding agents are supported?",
    answer:
      "The MVP exports AGENTS.md, Cursor rules, Qoder rules, and Claude Code files. Each target is rendered from the same ProjectSpec.",
  },
  {
    id: "model",
    category: "Export",
    question: "Does generation call a live model?",
    answer:
      "No. Generation is deterministic renderer output from the saved, validated spec. The interviewer calls the configured LLM provider when an API key is set.",
  },
  {
    id: "edit",
    category: "Export",
    question: "Can I edit the spec before I export?",
    answer:
      "Yes. Review is a first-class step. Change the spec, then generate again. Markdown and rules stay derived from that source of truth.",
  },
  {
    id: "scope",
    category: "Plans",
    question: "Do I need GitHub, billing, or a team workspace?",
    answer:
      "No. Those are explicitly out of the MVP. Sign in, start a project, and export locally.",
  },
] as const;

type Faq = (typeof faqs)[number];
const categories = ["All", "General", "Plans", "Export"] as const;
type Category = (typeof categories)[number];

function matches(faq: Faq, query: string, category: Category) {
  if (category !== "All" && faq.category !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
  );
}

/* ---------- Highlight kata yang cocok ---------- */

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "i"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-[#d4f26a]/25 px-0.5 text-[#eaffa0]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/* ---------- Plus yang berubah jadi minus ---------- */

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
        open
          ? "border-[#d4f26a]/40 bg-[#d4f26a]/15 text-[#d4f26a]"
          : "border-white/10 text-white/50 group-hover:border-white/25 group-hover:text-white"
      }`}
    >
      <span className="relative block size-3">
        <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded bg-current" />
        <motion.span
          className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 rounded bg-current"
          animate={{ rotate: open ? 90 : 0, scaleY: open ? 0 : 1 }}
          transition={{ duration: 0.3, ease: landingEase }}
        />
      </span>
    </span>
  );
}

/* ---------- Search ---------- */

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Section ---------- */

export function LandingFaq() {
  const enabled = useLandingMotion();
  const [openId, setOpenId] = useState<string | null>(faqs[0].id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const filtered = faqs.filter((faq) => matches(faq, query, category));

  function onQueryChange(value: string) {
    setQuery(value);
    // otomatis buka hasil pertama biar jawabannya langsung kelihatan
    const first = faqs.find((faq) => matches(faq, value, category));
    if (value.trim() && first) setOpenId(first.id);
  }

  function onCategoryChange(next: Category) {
    setCategory(next);
    const first = faqs.find((faq) => matches(faq, query, next));
    if (first && !faqs.some((f) => f.id === openId && matches(f, query, next))) {
      setOpenId(first.id);
    }
  }

  function reset() {
    setQuery("");
    setCategory("All");
    setOpenId(faqs[0].id);
  }

  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const ids = filtered.map((f) => f.id);
    const current = ids.findIndex((id) => buttonRefs.current[id] === document.activeElement);
    if (current === -1) return;
    let next = current;
    if (e.key === "ArrowDown") next = (current + 1) % ids.length;
    else if (e.key === "ArrowUp") next = (current - 1 + ids.length) % ids.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ids.length - 1;
    else return;
    e.preventDefault();
    const nextId = ids[next];
    if (nextId) buttonRefs.current[nextId]?.focus();
  }

  return (
    <section id="faqs" className={`${sectionClass} relative mt-28 scroll-mt-32 sm:mt-36`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-20 -z-10 h-[420px] w-[60%] rounded-full bg-[#d4f26a]/[0.04] blur-3xl"
      />

      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
        {/* ---------- Kiri (sticky) ---------- */}
        <Reveal className="lg:sticky lg:top-28">
          <SectionHeading eyebrow="FAQs" title="Got questions? We've got answers." />
          <p className={`${mutedClass} mt-5 max-w-sm`}>
            Still have questions? Start a project and walk through the interview.
            The product is the shortest explanation.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <StartButton variant="ghost">Start a project</StartButton>
            <span className="font-mono text-xs text-white/35">
              {faqs.length} answers, no fluff
            </span>
          </div>
        </Reveal>

        {/* ---------- Kanan ---------- */}
        <Reveal delay={0.08}>
          {/* Search */}
          <div className="group relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-[#d4f26a]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search frequently asked questions"
              className="w-full rounded-full border border-white/10 bg-[#101010] py-3 pl-11 pr-11 text-sm text-white placeholder:text-white/30 transition-colors focus:border-[#d4f26a]/50 focus:outline-none focus:ring-4 focus:ring-[#d4f26a]/10 [&::-webkit-search-cancel-button]:hidden"
            />
            <AnimatePresence>
              {query ? (
                <motion.button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => onQueryChange("")}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xs text-white/70 hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4f26a]"
                >
                  ×
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Chip kategori */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by topic">
            {categories.map((item) => {
              const selected = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onCategoryChange(item)}
                  className={`relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] ${
                    selected ? "text-[#14160c]" : "text-white/55 hover:text-white"
                  }`}
                >
                  {selected ? (
                    <motion.span
                      layoutId="faq-category"
                      className="absolute inset-0 rounded-full bg-[#d4f26a]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-full border border-white/10" />
                  )}
                  <span className="relative">{item}</span>
                </button>
              );
            })}
            <span
              role="status"
              aria-live="polite"
              className="ml-auto font-mono text-[11px] text-white/30"
            >
              {filtered.length} / {faqs.length}
            </span>
          </div>

          {/* List */}
          <ul className="mt-5 space-y-2.5" onKeyDown={onListKeyDown}>
            <AnimatePresence initial={false}>
              {filtered.map((faq) => {
                const open = openId === faq.id;
                const index = faqs.findIndex((f) => f.id === faq.id);
                const panelId = `faq-panel-${faq.id}`;
                const buttonId = `faq-button-${faq.id}`;

                return (
                  <motion.li
                    key={faq.id}
                    initial={enabled ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={enabled ? { opacity: 0, y: -6, transition: { duration: 0.15 } } : undefined}
                    transition={{ duration: 0.3, ease: landingEase }}
                    className={`relative overflow-hidden rounded-2xl border transition-colors duration-300 ${
                      open
                        ? "border-[#d4f26a]/30 bg-gradient-to-br from-[#d4f26a]/[0.08] via-[#101010] to-[#101010]"
                        : "border-white/8 bg-[#101010] hover:border-white/20"
                    }`}
                  >
                    {/* bar lime di kiri saat terbuka */}
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[3px] origin-top bg-[#d4f26a] shadow-[0_0_14px_rgba(212,242,106,0.6)]"
                      initial={false}
                      animate={{ scaleY: open ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: landingEase }}
                    />

                    <h3>
                      <button
                        type="button"
                        id={buttonId}
                        aria-expanded={open}
                        aria-controls={panelId}
                        ref={(node) => {
                          buttonRefs.current[faq.id] = node;
                        }}
                        onClick={() => setOpenId(open ? null : faq.id)}
                        className="group flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#d4f26a]"
                      >
                        <span
                          className={`font-mono text-[11px] transition-colors ${
                            open ? "text-[#d4f26a]" : "text-white/30"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`flex-1 text-[15px] transition-colors ${
                            open ? "text-white" : "text-white/80 group-hover:text-white"
                          }`}
                        >
                          <Highlight text={faq.question} query={query} />
                        </span>
                        <PlusMinus open={open} />
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={enabled ? { height: 0, opacity: 0 } : false}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={enabled ? { height: 0, opacity: 0 } : undefined}
                          transition={{ duration: 0.34, ease: landingEase }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pl-[3.25rem] pr-14">
                            <p className={`${mutedClass} text-sm`}>
                              <Highlight text={faq.answer} query={query} />
                            </p>
                            <span className="mt-3 inline-flex rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/35">
                              {faq.category}
                            </span>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* Empty state */}
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={enabled ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={enabled ? { opacity: 0 } : undefined}
                className="mt-2 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center"
              >
                <p className="text-sm text-white">
                  No answers for &ldquo;{query.trim() || category}&rdquo;
                </p>
                <p className="mt-1 text-sm text-[#8a8a84]">
                  Try a different keyword, or start a project and see for yourself.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
                >
                  Reset filters
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}