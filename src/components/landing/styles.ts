export const landingShellClass =
  "landing relative isolate min-h-full overflow-x-clip bg-[#080808] text-[#f3f3ee]";

export const sectionClass = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export const eyebrowClass =
  "text-[11px] font-medium uppercase tracking-[0.22em] text-[#8a8a84]";

export const displayClass =
  "landing-display text-[2.15rem] leading-[1.12] tracking-tight text-[#f3f3ee] sm:text-5xl lg:text-[3.5rem]";

export const sectionTitleClass =
  "landing-display text-[2rem] leading-[1.15] tracking-tight text-[#f3f3ee] sm:text-4xl lg:text-[2.75rem]";

export const mutedClass = "text-sm leading-6 text-[#8a8a84] sm:text-base sm:leading-7";

export const cardClass =
  "rounded-[28px] border border-white/8 bg-[#101010]";

export const limeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#d4f26a] px-5 py-2.5 text-sm font-medium text-[#14160c] transition hover:bg-[#e2f88a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-[#f3f3ee] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const navItems = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faqs", label: "FAQs" },
] as const;
