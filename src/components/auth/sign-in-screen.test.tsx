/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
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
  it("links to the sign-up route so Clerk can mount on /sign-up", () => {
    render(<SignInScreen clerkEnabled />);

    expect(screen.getByText("Clerk sign-in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("renders the Clerk sign-up form on the sign-up route", () => {
    render(<SignInScreen clerkEnabled mode="sign-up" />);

    expect(screen.getByText("Clerk sign-up")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});
