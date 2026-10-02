import Link from "next/link";
import {
  STATUS_LABELS,
  type ReviewViewModel,
} from "../../lib/review/view-model";
import { primaryButtonClass } from "./form-controls";

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
  return (
    <header className="border-b border-zinc-200 px-4 py-5 dark:border-zinc-800 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Link
            href={`/interview/${view.projectId}`}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
          >
            Back to interview
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Project Specification
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Review everything before generating your AI coding configuration.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="text-sm font-medium" role="status">
            {!valid
              ? "Needs attention"
              : view.spec.project.status === "ready"
                ? "Ready for generation"
                : STATUS_LABELS[view.spec.project.status]}
          </p>
          <p className="text-xs text-zinc-500" role="status">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={onSave}
            className={primaryButtonClass}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
