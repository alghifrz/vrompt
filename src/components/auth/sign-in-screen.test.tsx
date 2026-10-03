/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SignInScreen } from "./sign-in-screen";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  SignIn: () => <div>Clerk sign-in</div>,
  SignUp: () => <div>Clerk sign-up</div>,
}));

vi.mock("../landing/motion", () => ({
  useLandingMotion: () => false,
}));

describe("sign-in screen", () => {
  it("switches to sign-up on the same screen", async () => {
    const user = userEvent.setup();
    render(<SignInScreen clerkEnabled />);

    expect(screen.getByText("Clerk sign-in")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Create account" }));

    expect(screen.getByText("Clerk sign-up")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Start with a/ })).toBeInTheDocument();
  });
});
