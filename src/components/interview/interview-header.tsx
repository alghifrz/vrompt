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
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-4">
        <InterviewBackLink unsaved={unsaved} />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{view.projectName}</h1>
          <p className="text-xs text-zinc-500">
            {PHASE_LABELS[view.phase]} · {view.progress.current} of{" "}
            {view.progress.total}
          </p>
        </div>
      </div>
    </header>
  );
}
