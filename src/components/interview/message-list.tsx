"use client";

import { motion } from "framer-motion";
import type {
  InterviewViewMessage,
  InterviewViewQuestion,
} from "../../lib/interview/view-model";
import { BrandMark } from "../brand-mark";
import { landingEase, useLandingMotion } from "../landing/motion";

export function InterviewerAvatar() {
  return (
    <BrandMark
      className="mt-0.5 size-8 shrink-0 shadow-[0_0_20px_-4px_rgba(212,242,106,0.6)]"
    />
  );
}

export function MessageBubble({
  role,
  content,
  highlight = false,
}: {
  role: "user" | "assistant";
  content: string;
  /** pertanyaan yang sedang menunggu jawaban */
  highlight?: boolean;
}) {
  const enabled = useLandingMotion();
  const isUser = role === "user";

  return (
    <motion.div
      initial={enabled ? { opacity: 0, y: 14, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: landingEase }}
      className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser ? <InterviewerAvatar /> : null}
      <article
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[34rem] ${
          isUser
            ? "rounded-tr-md bg-[#d4f26a] text-[#14160c] shadow-[0_8px_30px_-12px_rgba(212,242,106,0.5)]"
            : highlight
              ? "rounded-tl-md border border-[#d4f26a]/30 bg-gradient-to-br from-[#d4f26a]/[0.09] to-[#141414] text-white shadow-[0_0_40px_-18px_rgba(212,242,106,0.6)]"
              : "rounded-tl-md border border-white/8 bg-[#141414] text-white/85"
        }`}
      >
        <p
          className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            isUser ? "text-[#14160c]/55" : "text-white/35"
          }`}
        >
          {isUser ? "You" : "Interviewer"}
        </p>
        <p className="whitespace-pre-wrap">{content}</p>
      </article>
    </motion.div>
  );
}

export function MessageList({
  messages,
  currentQuestion,
  pendingUser,
}: {
  messages: readonly InterviewViewMessage[];
  currentQuestion?: InterviewViewQuestion;
  pendingUser?: string;
}) {
  const empty = messages.length === 0 && !currentQuestion && !pendingUser;

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
      {empty ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center">
          <p className="text-sm text-white/55">
            The interview will begin with a focused question about your project.
          </p>
        </div>
      ) : null}
      {messages.map((message, index) => (
        <MessageBubble
          key={`${message.role}-${String(index)}`}
          role={message.role}
          content={message.content}
        />
      ))}
      {currentQuestion ? (
        <MessageBubble
          role="assistant"
          content={currentQuestion.text}
          highlight
        />
      ) : null}
      {pendingUser ? (
        <MessageBubble role="user" content={pendingUser} />
      ) : null}
    </div>
  );
}