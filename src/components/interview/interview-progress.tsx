import type { InterviewViewModel } from "../../lib/interview/view-model";

const STATE_LABEL: Record<string, string> = {
  complete: "Complete",
  current: "Current",
  skipped: "Skipped",
  upcoming: "Upcoming",
};

export function InterviewProgress({ view }: { view: InterviewViewModel }) {
  return (
    <nav aria-label="Interview progress" className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <ol className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {view.progress.phases.map((phase) => (
          <li key={phase.id} className="shrink-0">
            <span
              className={
                phase.state === "current"
                  ? "font-medium text-zinc-950 dark:text-zinc-50"
                  : phase.state === "complete"
                    ? "text-zinc-600 dark:text-zinc-400"
                    : phase.state === "skipped"
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : "text-zinc-400 dark:text-zinc-600"
              }
            >
              <span aria-hidden="true" className="mr-1">
                {phase.state === "complete"
                  ? "✓"
                  : phase.state === "current"
                    ? "●"
                    : phase.state === "skipped"
                      ? "–"
                      : "○"}
              </span>
              {phase.label}
              <span className="sr-only">, {STATE_LABEL[phase.state]}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
