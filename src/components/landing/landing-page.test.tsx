/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";

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
  Show: () => null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignOutButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  useUser: () => ({ isSignedIn: false, isLoaded: true }),
}));

describe("landing page", () => {
  it("switches pricing cycle and toggles an FAQ", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(document.querySelector("header")).toHaveClass("fixed");
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
    expect(screen.getByText("$19")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "yearly" }));
    expect(screen.getByText("$15")).toBeInTheDocument();
    expect(screen.queryByText("$19")).not.toBeInTheDocument();

    const firstFaq = screen.getByRole("button", {
      name: /What kind of projects is Vrompt for/i,
    });
    expect(firstFaq).toHaveAttribute("aria-expanded", "true");
    await user.click(firstFaq);
    expect(firstFaq).toHaveAttribute("aria-expanded", "false");
  });

  it("scrolls to the clicked nav section and keeps it current", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<LandingPage />);

    const pricingLinks = screen.getAllByRole("link", { name: "Pricing" });
    await user.click(pricingLinks[0]!);

    expect(scrollTo).toHaveBeenCalled();
    expect(pricingLinks[0]).toHaveAttribute("aria-current", "location");
    expect(window.location.hash).toBe("#pricing");
    scrollTo.mockRestore();
  });

  it("sends landing CTAs to the sign-in page when signed out", () => {
    render(<LandingPage />);

    const destinations = screen
      .getAllByRole("link", { name: /get started|start a project|start free/i })
      .map((link) => link.getAttribute("href"));

    expect(destinations.length).toBeGreaterThan(0);
    expect(destinations.every((href) => href === "/sign-in")).toBe(true);
  });

  it("changes the featured capability when a tab is selected", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /Progressive questions/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Tool adapters" }));
    expect(
      screen.getByRole("heading", { name: /formatted for each agent/i }),
    ).toBeInTheDocument();
  });
});
