"use client";

import Link from "next/link";

export function InterviewBackLink({ unsaved }: { unsaved: boolean }) {
  return (
    <Link
      href="/"
      className="text-sm text-zinc-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
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
      Back
    </Link>
  );
}
