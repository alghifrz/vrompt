"use client";

import { useEffect, useRef, useState } from "react";
import {
  canSubmitAnswer,
  type InterviewViewModel,
} from "../../lib/interview/view-model";
import { AnswerInput } from "./answer-input";
import { InterviewComplete } from "./interview-complete";
import { InterviewHeader } from "./interview-header";
import { InterviewProgress } from "./interview-progress";
import { MessageList } from "./message-list";

export type SubmitInterviewAnswer = (input: {
  projectId: string;
  sessionId: string;
  answer: string;
}) => Promise<
  | { ok: true; view: InterviewViewModel }
  | { ok: false; error: NonNullable<InterviewViewModel["error"]> }
>;

export function InterviewConversation({
  initialView,
  submitAnswer,
}: {
  initialView: InterviewViewModel;
  submitAnswer: SubmitInterviewAnswer;
}) {
  const [view, setView] = useState(initialView);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [view.messages, view.currentQuestion, submitting]);

  async function submit() {
    if (!canSubmitAnswer(draft, { submitting, completed: view.completed })) {
      return;
    }

    const answer = draft;
    setSubmitting(true);
    stickToBottom.current = true;

    try {
      const result = await submitAnswer({
        projectId: view.projectId,
        sessionId: view.sessionId,
        answer,
      });

      if (result.ok) {
        setView(result.view);
        setDraft("");
        return;
      }

      setView({
        ...view,
        error: result.error,
      });
    } catch {
      setView({
        ...view,
        error: {
          code: "SERVER_ERROR",
          message:
            "Something went wrong. Your typed answer was kept so you can retry.",
          retryable: true,
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <InterviewHeader view={view} unsaved={draft.trim().length > 0} />
      <InterviewProgress view={view} />
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          const target = event.currentTarget;
          stickToBottom.current =
            target.scrollHeight - target.scrollTop - target.clientHeight < 80;
        }}
      >
        <MessageList
          messages={view.messages}
          currentQuestion={view.completed ? undefined : view.currentQuestion}
        />
        {submitting ? (
          <p
            className="px-4 pb-4 text-sm text-zinc-500 motion-safe:animate-pulse"
            role="status"
            aria-live="polite"
          >
            Interviewer is thinking...
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      {view.error ? (
        <p
          className="px-4 py-2 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {view.error.message}
        </p>
      ) : null}

      {view.completed ? (
        <InterviewComplete projectId={view.projectId} />
      ) : (
        <AnswerInput
          value={draft}
          disabled={submitting}
          submitting={submitting}
          onChange={setDraft}
          onSubmit={() => {
            void submit();
          }}
        />
      )}
    </div>
  );
}
