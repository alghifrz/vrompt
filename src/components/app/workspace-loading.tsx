import { WORKSPACE_STAGE_LABELS, WORKSPACE_STAGES } from "../../lib/workspace/projects";
import { BrandMark } from "../brand-mark";

export function WorkspaceLoading({
  title,
  message,
  step,
  embedded = false,
}: {
  title: string;
  message: string;
  step?: number;
  embedded?: boolean;
}) {
  return (
    <div
      className={
        embedded
          ? "relative flex h-full min-h-[24rem] w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c0c] px-6 py-16 text-[#f3f3ee]"
          : "flex min-h-dvh w-full flex-col items-center justify-center bg-[#0c0c0c] px-6 py-16 text-[#f3f3ee]"
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,242,106,0.16),transparent_70%)]"
      />

      <div className="relative grid size-24 place-items-center">
        <span
          aria-hidden="true"
          className="absolute inset-[-14px] rounded-full border border-[#d4f26a]/20"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-[3px] border-[#d4f26a]/20 border-t-[#d4f26a] motion-safe:animate-spin"
          style={{ animationDuration: "1s" }}
        />
        <span
          aria-hidden="true"
          className="absolute size-20 rounded-full bg-[#d4f26a]/20 blur-2xl"
        />
        <BrandMark className="relative size-14 rounded-2xl shadow-[0_0_40px_-4px_rgba(212,242,106,0.85)]" />
      </div>

      <p className="relative mt-8 font-mono text-xs uppercase tracking-[0.22em] text-[#d4f26a]">
        {title}
      </p>
      <p
        className="relative mt-3 max-w-sm text-center text-lg font-medium text-white"
        role="status"
      >
        {message}
      </p>

      <span className="relative mt-5 flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <i
            key={index}
            className="size-2 rounded-full bg-[#d4f26a] motion-safe:animate-pulse"
            style={{ animationDelay: `${String(index * 160)}ms` }}
          />
        ))}
      </span>

      {step !== undefined ? (
        <ol
          className="relative mt-10 flex flex-wrap items-center justify-center gap-2"
          aria-hidden="true"
        >
          {WORKSPACE_STAGES.map((id, index) => {
            const current = index === step;
            const done = index < step;
            return (
              <li
                key={id}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  current
                    ? "border-[#d4f26a] bg-[#d4f26a]/15 text-[#d4f26a]"
                    : done
                      ? "border-white/15 bg-white/8 text-white/70"
                      : "border-white/10 text-white/35"
                }`}
              >
                {done ? "✓ " : ""}
                {WORKSPACE_STAGE_LABELS[id]}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
