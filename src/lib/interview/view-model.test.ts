import { describe, expect, it } from "vitest";
import { createInterviewSession } from "../../core/interview/engine";
import {
  buildProgress,
  canSubmitAnswer,
  displayProjectName,
  toInterviewViewModel,
  visibleMessages,
} from "./view-model";

describe("interview view model", () => {
  it("hides placeholder project names", () => {
    expect(displayProjectName("Untitled project")).toBe("New project");
    expect(displayProjectName("FieldKit")).toBe("FieldKit");
  });

  it("omits system messages from the conversation", () => {
    expect(
      visibleMessages([
        { role: "system", content: "internal prompt" },
        { role: "assistant", content: "What are you building?" },
        { role: "user", content: "A field toolkit." },
      ]),
    ).toEqual([
      { role: "assistant", content: "What are you building?" },
      { role: "user", content: "A field toolkit." },
    ]);
  });

  it("does not repeat the current question when it is already the last assistant message", () => {
    const session = createInterviewSession({ id: "sess-1" });
    const view = toInterviewViewModel({
      projectId: "proj-1",
      projectName: "Untitled project",
      session: {
        ...session,
        messages: [
          { role: "assistant", content: "What are you building?" },
        ],
        currentQuestion: {
          id: "q-discovery-1",
          phase: "discovery",
          text: "What are you building?",
          required: true,
        },
      },
    });

    expect(view.currentQuestion).toBeUndefined();
    expect(view.messages).toHaveLength(1);
    expect(view.projectName).toBe("New project");
  });

  it("shows the current question when it is not already in the transcript", () => {
    const session = createInterviewSession({ id: "sess-1" });
    const view = toInterviewViewModel({
      projectId: "proj-1",
      projectName: "FieldKit",
      session: {
        ...session,
        currentQuestion: {
          id: "q-1",
          phase: "discovery",
          text: "What problem does this solve?",
          required: true,
        },
      },
    });

    expect(view.currentQuestion?.text).toBe("What problem does this solve?");
  });

  it("marks skipped and current phases from the server session", () => {
    const progress = buildProgress("features", ["stack"]);

    expect(progress.phases.find((item) => item.id === "discovery")?.state).toBe(
      "complete",
    );
    expect(progress.phases.find((item) => item.id === "features")?.state).toBe(
      "current",
    );
    expect(progress.phases.find((item) => item.id === "users")?.state).toBe(
      "upcoming",
    );
    expect(progress.current).toBe(3);
  });

  it("does not expose owner identity or a raw spec", () => {
    const view = toInterviewViewModel({
      projectId: "proj-1",
      projectName: "FieldKit",
      session: createInterviewSession({ id: "sess-1" }),
    });

    expect(view).not.toHaveProperty("ownerId");
    expect(view).not.toHaveProperty("spec");
    expect(JSON.stringify(view)).not.toContain("DATABASE_URL");
  });

  it("rejects empty or in-flight answers", () => {
    expect(canSubmitAnswer("  ", { submitting: false, completed: false })).toBe(
      false,
    );
    expect(canSubmitAnswer("Hello", { submitting: true, completed: false })).toBe(
      false,
    );
    expect(canSubmitAnswer("Hello", { submitting: false, completed: true })).toBe(
      false,
    );
    expect(canSubmitAnswer("Hello", { submitting: false, completed: false })).toBe(
      true,
    );
  });
});
