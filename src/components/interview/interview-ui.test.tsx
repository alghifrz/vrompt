/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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
import type { InterviewViewModel } from "../../lib/interview/view-model";
import { AnswerInput } from "./answer-input";
import { InterviewComplete } from "./interview-complete";
import {
  InterviewConversation,
  type SubmitInterviewAnswer,
} from "./interview-conversation";
import { InterviewProgress } from "./interview-progress";
import { MessageList } from "./message-list";

const baseView: InterviewViewModel = {
  sessionId: "sess-1",
  projectId: "proj-1",
  projectName: "New project",
  phase: "features",
  messages: [
    { role: "assistant", content: "What are the main features?" },
    { role: "user", content: "A visit board and offline notes." },
  ],
  currentQuestion: {
    id: "q-2",
    phase: "features",
    text: "Which feature is most important for launch?",
  },
  completed: false,
  skippedPhases: ["database"],
  progress: {
    current: 3,
    total: 11,
    phases: [
      { id: "discovery", label: "Discovery", state: "complete" },
      { id: "goals", label: "Goals", state: "complete" },
      { id: "features", label: "Features", state: "current" },
      { id: "users", label: "Users", state: "upcoming" },
      { id: "database", label: "Database", state: "skipped" },
    ],
  },
};

describe("interview UI", () => {
  it("renders assistant and user messages", () => {
    render(
      <MessageList
        messages={baseView.messages}
        currentQuestion={baseView.currentQuestion}
      />,
    );

    expect(screen.getByText("What are the main features?")).toBeInTheDocument();
    expect(
      screen.getByText("A visit board and offline notes."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Which feature is most important for launch?"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Interviewer").length).toBeGreaterThan(0);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows an empty-state explanation when there is no conversation yet", () => {
    render(<MessageList messages={[]} />);

    expect(
      screen.getByText(/interview will begin with a focused question/i),
    ).toBeInTheDocument();
  });

  it("renders progress, including a skipped phase", () => {
    render(<InterviewProgress view={baseView} />);

    expect(screen.getByRole("navigation", { name: "Interview progress" })).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText(/Skipped/)).toBeInTheDocument();
  });

  it("renders the completed state without an answer input", () => {
    render(<InterviewComplete projectId="proj-1" />);

    expect(screen.getByRole("heading", { name: "Interview complete" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review specification" }),
    ).toHaveAttribute("href", "/review/proj-1");
    expect(screen.queryByLabelText("Interview answer")).not.toBeInTheDocument();
  });

  it("labels the answer input for assistive technology", () => {
    render(
      <AnswerInput
        value=""
        disabled={false}
        submitting={false}
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Interview answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("does not submit an empty answer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AnswerInput
        value="   "
        disabled={false}
        submitting={false}
        onChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid answer and disables input while loading", async () => {
    const user = userEvent.setup();
    let resolveSubmit: (value: { ok: true; view: InterviewViewModel }) => void =
      () => undefined;
    const submitAnswer = vi.fn(
      () =>
        new Promise<{ ok: true; view: InterviewViewModel }>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      <InterviewConversation initialView={baseView} submitAnswer={submitAnswer} />,
    );

    await user.type(screen.getByLabelText("Interview answer"), "The visit board");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(submitAnswer).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Interview answer")).toBeDisabled();
    expect(screen.getByLabelText("Interview answer")).toHaveValue("");
    expect(screen.getByText("The visit board")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Interviewer is thinking");

    resolveSubmit({
      ok: true,
      view: {
        ...baseView,
        messages: [
          ...baseView.messages,
          { role: "user", content: "The visit board" },
        ],
      },
    });
  });

  it("prevents a second submission while one is pending", async () => {
    const user = userEvent.setup();
    const submitAnswer = vi.fn(
      () => new Promise<Awaited<ReturnType<SubmitInterviewAnswer>>>(() => undefined),
    );

    render(
      <InterviewConversation initialView={baseView} submitAnswer={submitAnswer} />,
    );

    await user.type(screen.getByLabelText("Interview answer"), "First answer");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "Sending" }));

    expect(submitAnswer).toHaveBeenCalledTimes(1);
  });

  it("hides the composer on a completed interview", () => {
    render(
      <InterviewConversation
        initialView={{ ...baseView, completed: true, currentQuestion: undefined }}
        submitAnswer={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Interview answer")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Interview complete" })).toBeInTheDocument();
  });

  it("keeps the typed answer when submission fails", async () => {
    const user = userEvent.setup();
    const submitAnswer = vi.fn(async () => ({
      ok: false as const,
      error: {
        code: "PROVIDER_ERROR",
        message: "The interviewer is temporarily unavailable. Try again.",
        retryable: true,
      },
    }));

    render(
      <InterviewConversation initialView={baseView} submitAnswer={submitAnswer} />,
    );

    const field = screen.getByLabelText("Interview answer");
    await user.type(field, "Retry this");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The interviewer is temporarily unavailable",
    );
    expect(screen.getByLabelText("Interview answer")).toHaveValue("Retry this");
  });

  it("keeps the typed answer when the server action throws", async () => {
    const user = userEvent.setup();
    const submitAnswer = vi.fn(async () => {
      throw new Error("network down");
    });

    render(
      <InterviewConversation initialView={baseView} submitAnswer={submitAnswer} />,
    );

    await user.type(screen.getByLabelText("Interview answer"), "Keep this");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your typed answer was kept",
    );
    expect(screen.getByLabelText("Interview answer")).toHaveValue("Keep this");
    expect(screen.getByLabelText("Interview answer")).not.toBeDisabled();
  });

  it("asks before leaving when an unsent answer is in the composer", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <InterviewConversation initialView={baseView} submitAnswer={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("Interview answer"), "Unsent notes");
    await user.click(screen.getByRole("link", { name: "Back" }));

    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
});
