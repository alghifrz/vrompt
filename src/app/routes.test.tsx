/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  UserButton: () => null,
  SignIn: () => <div>Clerk sign-in</div>,
}));

vi.mock("./actions/interview", () => ({
  startInterviewAction: vi.fn(),
}));

const loadInterview = vi.fn();
const loadReview = vi.fn();
const loadGenerate = vi.fn();

vi.mock("../server/runtime", () => ({
  getInterviewFlow: () => ({ loadInterview }),
  getReviewFlow: () => ({ load: loadReview }),
  getGenerationFlow: () => ({ load: loadGenerate }),
}));

vi.mock("../server/application/interview-flow", () => ({
  isAuthFailure: (error: { name?: string }) => error?.name === "AuthError",
}));

vi.mock("../server/application/review-flow", () => ({
  isReviewAuthFailure: (error: { name?: string }) => error?.name === "AuthError",
}));

vi.mock("../server/application/generation-flow", () => ({
  isGenerationAuthFailure: (error: { name?: string }) => error?.name === "AuthError",
}));

const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const redirect = vi.fn((href: string) => {
  throw new Error(`REDIRECT:${href}`);
});

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (href: string) => redirect(href),
}));

const { default: Home } = await import("./page");
const { default: StartPage } = await import("./start/page");
const { default: SignInPage } = await import("./sign-in/[[...sign-in]]/page");
const { default: NotFoundPage } = await import("./not-found");
const { default: AppError } = await import("./error");
const { default: InterviewPage } = await import("./interview/[projectId]/page");
const { default: ReviewPage } = await import("./review/[projectId]/page");
const { default: GeneratePage } = await import("./generate/[projectId]/page");

describe("public routes", () => {
  it("renders the home page", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Vrompt" })).toBeInTheDocument();
    expect(
      screen.getByText(/Turn a project idea into a structured specification/),
    ).toBeInTheDocument();
    expect(screen.getByText("Interview → Review → Generate")).toBeInTheDocument();
    expect(screen.getByText("AGENTS.md")).toBeInTheDocument();
  });

  it("renders the start page without extra fields", async () => {
    render(await StartPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Start a project" })).toBeInTheDocument();
    expect(
      screen.getByText(/structured series of questions/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create project and begin" }),
    ).toBeInTheDocument();
  });

  it("explains that authentication is not configured", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByText(/Authentication is not configured/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/CLERK_SECRET_KEY/)).not.toBeInTheDocument();
  });

  it("renders a safe not-found page", () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("heading", { name: "Page not available" })).toBeInTheDocument();
    expect(screen.getByText(/may not exist, or you may not have/)).toBeInTheDocument();
  });

  it("renders a safe error page without the raw error", () => {
    render(
      <AppError
        error={Object.assign(new Error("TypeError: Cannot read properties of undefined"), {
          digest: "abc",
        })}
        reset={() => undefined}
      />,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("protected project routes", () => {
  beforeEach(() => {
    loadInterview.mockReset();
    loadReview.mockReset();
    loadGenerate.mockReset();
    notFound.mockClear();
    redirect.mockClear();
  });

  it("redirects unauthenticated interview access", async () => {
    loadInterview.mockRejectedValueOnce({ name: "AuthError" });

    await expect(
      InterviewPage({ params: Promise.resolve({ projectId: "missing" }) }),
    ).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("uses a shared not-found for missing interview projects", async () => {
    loadInterview.mockResolvedValueOnce({ ok: false, error: { code: "NOT_FOUND" } });

    await expect(
      InterviewPage({ params: Promise.resolve({ projectId: "does-not-exist" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("uses a shared not-found for missing review projects", async () => {
    loadReview.mockResolvedValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "This project is not available." },
    });

    await expect(
      ReviewPage({ params: Promise.resolve({ projectId: "does-not-exist" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("uses a shared not-found for missing generate projects", async () => {
    loadGenerate.mockResolvedValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "This project is not available." },
    });

    await expect(
      GeneratePage({ params: Promise.resolve({ projectId: "does-not-exist" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
