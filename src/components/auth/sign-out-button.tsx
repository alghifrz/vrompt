"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

export const signOutButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]";

export function SignOutButton({
  children = "Sign out",
  className = signOutButtonClass,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <ClerkSignOutButton redirectUrl="/">
      <button type="button" className={className}>
        {children}
      </button>
    </ClerkSignOutButton>
  );
}
