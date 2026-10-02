"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { primaryButtonClass } from "./review/form-controls";

export function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Authentication is not configured in this environment.
        </p>
        <Link href="/sign-in" className={`${primaryButtonClass} inline-flex`}>
          Start a project
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className={primaryButtonClass}>
            Start a project
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/start" className={`${primaryButtonClass} inline-flex`}>
          Start a project
        </Link>
        <UserButton />
      </Show>
    </div>
  );
}
