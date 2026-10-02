"use client";

import Link from "next/link";

export function InterviewBackLink({ unsaved }: { unsaved: boolean }) {
  return (
    <Link
      href="/start"
      className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
      onClick={(event) => {
        if (
          unsaved &&
          !window.confirm(
            "Leave this interview? Your unsent answer will be lost.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <span
        aria-hidden="true"
        className="transition-transform group-hover:-translate-x-0.5"
      >
        ←
      </span>
      Back
    </Link>
  );
}