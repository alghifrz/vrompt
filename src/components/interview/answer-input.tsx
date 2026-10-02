"use client";

/**
 * Enter submits. Shift+Enter inserts a newline so multiline answers stay
 * explicit and accidental one-key submits of long notes still work.
 */
export function AnswerInput({
  value,
  disabled,
  submitting,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-zinc-800 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="interview-answer">
        Interview answer
      </label>
      <textarea
        id="interview-answer"
        name="answer"
        rows={3}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type your answer..."
        className="min-h-20 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:outline-zinc-100"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="h-10 shrink-0 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        {submitting ? "Sending" : "Send"}
      </button>
    </form>
  );
}
