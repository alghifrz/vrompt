"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  canSubmitAnswer,
  type InterviewViewModel,
} from "../../lib/interview/view-model";
import { landingEase, useLandingMotion } from "../landing/motion";
import { AnswerInput } from "./answer-input";
import { InterviewComplete } from "./interview-complete";
import { InterviewHeader } from "./interview-header";
import { InterviewProgress } from "./interview-progress";
import { InterviewerAvatar, MessageList } from "./message-list";

export type SubmitInterviewAnswer = (input: {
  projectId: string;
  sessionId: string;
  answer: string;
}) => Promise<
  | { ok: true; view: InterviewViewModel }
  | { ok: false; error: NonNullable<InterviewViewModel["error"]> }
>;

function Thinking() {
  const enabled = useLandingMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 pb-6 sm:px-6"
    >
      <InterviewerAvatar />
      <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/8 bg-[#141414] px-4 py-3">
        <span aria-hidden="true" className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.i
              key={i}
              className="size-1.5 rounded-full bg-[#d4f26a]"
              animate={
                enabled
                  ? { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }
                  : { opacity: 0.7 }
              }
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </span>
        <span className="text-xs text-white/50">Interviewer is thinking...</span>
      </div>
    </div>
  );
}

export function InterviewConversation({
  initialView,
  submitAnswer,
}: {
  initialView: InterviewViewModel;
  submitAnswer: SubmitInterviewAnswer;
}) {
  const enabled = useLandingMotion();
  const [view, setView] = useState(initialView);
  const [draft, setDraft] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  function scrollToLatest(smooth = false) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      return;
    }
    scroller.scrollTop = scroller.scrollHeight;
  }

  useEffect(() => {
    if (stickToBottom.current) {
      scrollToLatest();
    }
  }, [view.messages, view.currentQuestion, pendingUser, submitting]);

  async function submit() {
    if (!canSubmitAnswer(draft, { submitting, completed: view.completed })) {
      return;
    }

    const answer = draft.trim();
    setPendingUser(answer);
    setDraft("");
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
        setPendingUser(null);
        return;
      }

      setPendingUser(null);
      setDraft(answer);
      setView({
        ...view,
        error: result.error,
      });
    } catch {
      setPendingUser(null);
      setDraft(answer);
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <InterviewHeader view={view} unsaved={draft.trim().length > 0} />
      <InterviewProgress view={view} />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const target = event.currentTarget;
            const nearBottom =
              target.scrollHeight - target.scrollTop - target.clientHeight < 80;
            stickToBottom.current = nearBottom;
            setShowJump(!nearBottom);
          }}
        >
          <MessageList
            messages={view.messages}
            currentQuestion={view.completed ? undefined : view.currentQuestion}
            pendingUser={pendingUser ?? undefined}
          />
          {submitting ? <Thinking /> : null}
        </div>

        {showJump ? (
          <motion.button
            type="button"
            initial={enabled ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: landingEase }}
            onClick={() => {
              stickToBottom.current = true;
              scrollToLatest(true);
            }}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#141414]/90 px-3.5 py-1.5 text-xs text-white/75 shadow-lg backdrop-blur transition-colors hover:border-[#d4f26a]/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
          >
            Jump to latest
            <span aria-hidden="true">↓</span>
          </motion.button>
        ) : null}
      </div>

      {view.error ? (
        <motion.p
          role="alert"
          initial={enabled ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: landingEase }}
          className="mx-4 mb-2 flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:mx-6"
        >
          <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.8V8.6M8 10.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {view.error.message}
        </motion.p>
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