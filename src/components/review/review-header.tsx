import Link from "next/link";
import {
  STATUS_LABELS,
  type ReviewViewModel,
} from "../../lib/review/view-model";
import { ghostButtonClass, primaryButtonClass } from "./form-controls";

export function ReviewHeader({
  view,
  dirty,
  saving,
  saveLabel,
  valid,
  onSave,
}: {
  view: ReviewViewModel;
  dirty: boolean;
  saving: boolean;
  saveLabel: string;
  valid: boolean;
  onSave: () => void;
}) {
  const status = !valid
    ? "Needs attention"
    : view.spec.project.status === "ready"
      ? "Ready for generation"
      : STATUS_LABELS[view.spec.project.status];

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0c0c0c] px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href={`/interview/${view.projectId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
          >
            <span aria-hidden="true">←</span>
            Back to interview
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Step 2 of 3 · Review
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Project Specification
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
              Fix anything unclear, then continue. Generation writes the ZIP
              from this spec.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span
              role="status"
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                !valid
                  ? "border border-rose-300/30 bg-rose-400/10 text-rose-200"
                  : view.spec.project.status === "ready"
                    ? "border border-[#d4f26a]/30 bg-[#d4f26a]/10 text-[#d4f26a]"
                    : "border border-white/10 bg-white/5 text-white/70"
              }`}
            >
              {status}
            </span>
            <span className="text-xs text-white/40" role="status">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={onSave}
            className={dirty ? primaryButtonClass : ghostButtonClass}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
