import type { InterviewViewModel } from "../../lib/interview/view-model";
import { PHASE_LABELS } from "../../lib/interview/view-model";
import { InterviewBackLink } from "./interview-back-link";

export function InterviewHeader({
  view,
  unsaved = false,
}: {
  view: InterviewViewModel;
  unsaved?: boolean;
}) {
  const { current, total } = view.progress;
  const percent =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="relative shrink-0 border-b border-white/8 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InterviewBackLink unsaved={unsaved} />
          <p className="min-w-0 truncate text-xs text-white/45">
            Step 1 of 3 · {PHASE_LABELS[view.phase]} · {current} of {total}
          </p>
        </div>
        <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-white/50 sm:inline">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Interview completion"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5"
      >
        <div
          className="h-full bg-[#d4f26a] transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
