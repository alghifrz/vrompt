"use client";

import { motion } from "framer-motion";
import { useFormStatus } from "react-dom";
import { useLandingMotion } from "./landing/motion";

export function StartSubmitButton() {
  const { pending } = useFormStatus();
  const enabled = useLandingMotion();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      whileHover={enabled && !pending ? { y: -2 } : undefined}
      whileTap={enabled && !pending ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#d4f26a] px-6 py-3 text-sm font-semibold text-[#14160c] shadow-[0_10px_40px_-10px_rgba(212,242,106,0.6)] transition-[background-color,box-shadow] duration-300 hover:bg-[#e2f88a] hover:shadow-[0_14px_50px_-10px_rgba(212,242,106,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-80 disabled:shadow-none"
    >
      {/* shine saat hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-10 w-8 -skew-x-12 bg-white/50 blur-[3px] transition-transform duration-700 ease-out group-hover:translate-x-[22rem] group-disabled:hidden"
      />

      {pending ? (
        <>
          <svg
            className="relative size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="relative">Creating project...</span>
        </>
      ) : (
        <>
          <span className="relative">Create project and begin</span>
          <span
            aria-hidden="true"
            className="relative transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </>
      )}
    </motion.button>
  );
}