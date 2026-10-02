"use client";

import { useEffect, useRef } from "react";

const MAX_HEIGHT = 200;

type AnswerInputProps = {
  value: string;
  disabled: boolean;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * Enter submits the answer.
 * Shift+Enter inserts a newline for multiline answers.
 */
export function AnswerInput({
  value,
  disabled,
  submitting,
  onChange,
  onSubmit,
}: AnswerInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wasDisabled = useRef(disabled);

  // Auto-grow textarea based on content, capped at MAX_HEIGHT.
  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  // Restore focus after submission is complete.
  useEffect(() => {
    if (wasDisabled.current && !disabled) {
      ref.current?.focus();
    }

    wasDisabled.current = disabled;
  }, [disabled]);

  const empty = value.trim().length === 0;

  const handleSubmit = () => {
    if (disabled || empty || submitting) return;

    onSubmit();
  };

  return (
    <form
      className="sticky bottom-0 z-20 shrink-0 border-t border-white/8 bg-[#0c0c0c]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111111] p-2 transition-[border-color,box-shadow] duration-300 focus-within:border-[#d4f26a]/50 focus-within:shadow-[0_0_0_4px_rgba(212,242,106,0.08)] ${
          disabled ? "opacity-70" : ""
        }`}
      >
        <label className="sr-only" htmlFor="interview-answer">
          Interview answer
        </label>

        <textarea
          ref={ref}
          id="interview-answer"
          name="answer"
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type your answer..."
          className="max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white placeholder:text-white/30 focus:outline-none disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={disabled || empty || submitting}
          className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#d4f26a] px-4 text-sm font-semibold text-[#14160c] shadow-[0_8px_24px_-8px_rgba(212,242,106,0.7)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#e2f88a] enabled:active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? (
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : null}

          {submitting ? "Sending" : "Send"}

          {!submitting ? (
            <svg
              viewBox="0 0 16 16"
              className="size-3.5 transition-transform duration-200 group-enabled:group-hover:-translate-y-0.5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
      </div>

      <div className="mt-2 hidden items-center justify-between px-1 font-mono text-[10px] text-white/30 sm:flex">
        <span>Enter to send · Shift+Enter for a new line</span>

        {!empty && !disabled ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-amber-300/70"
            />
            Unsent draft
          </span>
        ) : null}
      </div>
    </form>
  );
}
