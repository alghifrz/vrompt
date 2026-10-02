/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({
    children,
    redirectUrl,
  }: {
    children: ReactNode;
    redirectUrl?: string;
  }) => (
    <div data-redirect={redirectUrl} onClick={() => signOut(redirectUrl)}>
      {children}
    </div>
  ),
}));

import { SignOutButton } from "./sign-out-button";

describe("SignOutButton", () => {
  it("signs the user out and returns to the marketing site", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledWith("/");
  });
});
