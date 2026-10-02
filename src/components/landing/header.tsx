"use client";

import { Show, UserButton } from "@clerk/nextjs";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton, signOutButtonClass } from "../auth/sign-out-button";
import { useLandingMotion } from "./motion";
import { LANDING_HEADER_OFFSET, scrollToLandingSection } from "./nav-scroll";
import { StartButton } from "./start-button";
import { navItems } from "./styles";
import { LogoMark } from "./ui";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block size-4">
      <motion.span
        className="absolute left-0 top-1/2 h-[1.5px] w-full rounded bg-current"
        animate={{ y: open ? 0 : -4, rotate: open ? 45 : 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.span
        className="absolute left-0 top-1/2 h-[1.5px] w-full rounded bg-current"
        animate={{ y: open ? 0 : 4, rotate: open ? -45 : 0 }}
        transition={{ duration: 0.25 }}
      />
    </span>
  );
}

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const lockUntil = useRef(0);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  const enabled = useLandingMotion();
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 12);
  });

  function onNavClick(
    event: { preventDefault: () => void },
    href: string,
  ) {
    event.preventDefault();
    setOpen(false);
    lockUntil.current = performance.now() + 2000;
    setActive(href);
    setHovered(null);
    scrollToLandingSection(href);
  }

  useEffect(() => {
    const ids = navItems.map((item) => item.href.slice(1));

    const syncActive = () => {
      if (performance.now() < lockUntil.current) {
        return;
      }

      if (window.scrollY < 80) {
        setActive("");
        return;
      }

      const marker = window.scrollY + LANDING_HEADER_OFFSET + 12;
      let current = "";
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) {
          continue;
        }
        const top = element.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) {
          current = `#${id}`;
        }
      }
      setActive(current);
    };

    syncActive();
    window.addEventListener("scroll", syncActive, { passive: true });
    return () => window.removeEventListener("scroll", syncActive);
  }, []);

  // Mobile menu: Escape, auto-close di desktop, lock scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const pillTarget = hovered ?? active;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      {/* Backdrop mobile menu */}
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{
          maxWidth: 1024,
          backgroundColor: "rgba(12,12,12,0.6)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
        animate={{
          maxWidth: scrolled ? 880 : 1024,
          backgroundColor: scrolled ? "rgba(12,12,12,0.92)" : "rgba(12,12,12,0.6)",
          boxShadow: scrolled
            ? "0 18px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,242,106,0.04)"
            : "0 10px 40px rgba(0,0,0,0.2)",
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto flex w-full items-center justify-between rounded-full border border-white/10 px-2.5 py-2 backdrop-blur-xl sm:px-3"
      >
        {/* Highlight tipis di tepi atas */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Scroll progress di tepi bawah */}
        <motion.span
          aria-hidden="true"
          style={{ scaleX: progress }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          className="pointer-events-none absolute inset-x-6 -bottom-px h-px origin-left bg-gradient-to-r from-[#d4f26a]/0 via-[#d4f26a]/80 to-[#d4f26a]"
        />

        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full pl-1.5 leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
        >
          <LogoMark />
        </Link>

        <nav
          className="hidden items-center gap-0.5 lg:flex"
          aria-label="Landing"
          onMouseLeave={() => setHovered(null)}
        >
          {navItems.map((item) => {
            const isActive = active === item.href;
            const showPill = pillTarget === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => onNavClick(event, item.href)}
                onMouseEnter={() => setHovered(item.href)}
                onFocus={() => setHovered(item.href)}
                onBlur={() => setHovered(null)}
                className="relative rounded-full px-3.5 py-2 text-sm text-[#a8a8a2] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-[current=location]:text-white"
              >
                {showPill && enabled ? (
                  <motion.span
                    layoutId="landing-nav-pill"
                    className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/10"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <span className="relative">{item.label}</span>
                {/* Dot kecil penanda section aktif */}
                {isActive ? (
                  <motion.span
                    layoutId="landing-nav-dot"
                    className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#d4f26a]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {clerkEnabled ? (
            <Show when="signed-in">
              <div className="flex items-center gap-2">
                <SignOutButton className={`${signOutButtonClass} hidden rounded-full px-3 py-1.5 sm:inline-flex`} />
                <UserButton />
              </div>
            </Show>
          ) : null}
          <div className="hidden sm:block">
            <StartButton variant="nav">Get started</StartButton>
          </div>
          <motion.button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            whileTap={enabled ? { scale: 0.92 } : undefined}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={open} />
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="landing-mobile-nav"
            aria-label="Mobile"
            initial={enabled ? { opacity: 0, y: -12, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={enabled ? { opacity: 0, y: -12, scale: 0.98 } : undefined}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-2 w-full max-w-5xl origin-top overflow-hidden rounded-3xl border border-white/10 bg-[#101010]/95 p-3 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <motion.ul
              className="flex flex-col"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
              }}
            >
              {navItems.map((item, index) => {
                const isActive = active === item.href;
                return (
                  <motion.li
                    key={item.href}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 },
                    }}
                  >
                    <a
                      href={item.href}
                      onClick={(event) => onNavClick(event, item.href)}
                      aria-current={isActive ? "location" : undefined}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] text-[#c4c4be] transition-colors hover:bg-white/5 hover:text-white aria-[current=location]:bg-white/5 aria-[current=location]:text-white"
                    >
                      <span className="w-5 font-mono text-[11px] text-white/30 group-aria-[current=location]:text-[#d4f26a]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <span
                        aria-hidden="true"
                        className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#d4f26a]"
                      >
                        →
                      </span>
                    </a>
                  </motion.li>
                );
              })}
            </motion.ul>

            <div className="mt-2 space-y-2 border-t border-white/10 pt-3 sm:hidden">
              <StartButton className="w-full">Get started</StartButton>
              {clerkEnabled ? (
                <Show when="signed-in">
                  <SignOutButton className={`${signOutButtonClass} w-full rounded-2xl py-3`} />
                </Show>
              ) : null}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}