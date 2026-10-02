"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import { SignOutButton, signOutButtonClass } from "./sign-out-button";

export function AccountCard() {
  return (
    <Show when="signed-in">
      <SignedInAccount />
    </Show>
  );
}

function SignedInAccount() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || user?.firstName || email || "Signed in";

  return (
    <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-3">
        <UserButton />
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-white/80">
            {name}
          </span>
          <span className="block truncate text-[11px] text-white/40">
            {email && name !== email ? email : "Account"}
          </span>
        </span>
      </div>
      <SignOutButton className={`${signOutButtonClass} w-full`} />
    </div>
  );
}
