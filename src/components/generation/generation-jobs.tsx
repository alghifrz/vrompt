"use client";

import { useState } from "react";
import type { GenerationJob } from "../../core/generation/jobs";
import { ghostButtonClass } from "../review/form-controls";

export function GenerationJobs({ jobs }: { jobs: readonly GenerationJob[] }) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="jobs-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
            Step 03
          </p>
          <h2 id="jobs-heading" className="mt-1 text-lg font-medium">
            AI jobs
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
            Unzip the export, then paste one prompt at a time. Finish a job
            before starting the next.
          </p>
        </div>
        <p className="text-sm text-white/40">{jobs.length} jobs</p>
      </div>
      <ol className="space-y-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </ol>
    </section>
  );
}

function JobCard({ job }: { job: GenerationJob }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(job.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-white/8 bg-[#101010]/80">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/10 font-mono text-[11px] text-white/55">
          {String(job.step).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{job.title}</h3>
          <p className="mt-0.5 text-sm leading-6 text-white/45">{job.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={ghostButtonClass}
            onClick={() => {
              void copyPrompt();
            }}
          >
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`job-prompt-${job.id}`}
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">{open ? "Hide prompt" : "Show prompt"}</span>
            <svg
              viewBox="0 0 16 16"
              className={`size-4 transition-transform ${open ? "-rotate-180" : ""}`}
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <pre
          id={`job-prompt-${job.id}`}
          className="border-t border-white/8 bg-black/25 px-4 py-3 font-mono text-xs leading-6 whitespace-pre-wrap text-white/70"
        >
          {job.prompt}
        </pre>
      ) : null}
    </li>
  );
}
