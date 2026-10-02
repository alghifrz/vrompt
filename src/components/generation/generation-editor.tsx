"use client";

import Link from "next/link";
import { useState } from "react";
import { GENERATION_TARGET_DEFINITIONS } from "../../core/generation/targets";
import type { GenerationTarget } from "../../core/generation/types";
import {
  exportQuery,
  targetLabel,
  type GenerationPageView,
  type GenerationResultView,
  type GenerationViewError,
} from "../../lib/generation/view-model";
import { WorkspaceLoading } from "../app/workspace-loading";
import { ghostButtonClass, primaryButtonClass } from "../review/form-controls";
import { GenerationDocPreview } from "./generation-doc-preview";
import { GenerationJobs } from "./generation-jobs";

export type GenerateProject = (input: {
  projectId: string;
  targets: readonly string[];
}) => Promise<
  | { ok: true; view: GenerationResultView }
  | { ok: false; error: GenerationViewError }
>;

export function GenerationEditor({
  page,
  generateProject,
}: {
  page: GenerationPageView;
  generateProject: GenerateProject;
}) {
  const [selected, setSelected] = useState<GenerationTarget[]>(["cursor"]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResultView | undefined>();
  const [error, setError] = useState<GenerationViewError | undefined>();
  const [preview, setPreview] = useState<{ target: string; path: string; content: string }>();
  const [downloading, setDownloading] = useState(false);

  if (!page.ready) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
          Generate
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Generation</h1>
        <p
          className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100"
          role="alert"
        >
          This project is not ready for generation. Return to Review and mark
          the project as ready.
        </p>
        <Link
          href={`/review/${page.projectId}`}
          className={`${ghostButtonClass} mt-6 w-fit`}
        >
          Return to Review
        </Link>
      </main>
    );
  }

  async function generate() {
    if (generating || selected.length === 0) {
      return;
    }

    setGenerating(true);
    setError(undefined);
    try {
      const next = await generateProject({
        projectId: page.projectId,
        targets: selected,
      });
      if (next.ok) {
        setResult(next.view);
        const firstDoc =
          next.view.docs.find((file) => file.path.endsWith("PRD.md")) ??
          next.view.docs[0];
        const firstTarget = next.view.targets[0]?.files[0];
        setPreview(
          firstDoc
            ? { target: "docs", path: firstDoc.path, content: firstDoc.content }
            : firstTarget
              ? {
                  target: next.view.targets[0]!.target,
                  path: firstTarget.path,
                  content: firstTarget.content,
                }
              : undefined,
        );
        return;
      }

      setError(next.error);
    } catch {
      setError({
        code: "GENERATION_FAILED",
        message: "Generation failed. The saved specification was not changed.",
        retryable: true,
      });
    } finally {
      setGenerating(false);
    }
  }

  function toggleTarget(id: GenerationTarget) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      {generating ? (
        <div className="absolute inset-0 z-30 bg-[#0c0c0c]/88 backdrop-blur-sm">
          <WorkspaceLoading
            title="Step 3 of 3"
            message="Writing rules, PRD, ERD, and jobs..."
            step={2}
            embedded
          />
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0c0c0c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/review/${page.projectId}`}
              className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Back to review
            </Link>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
              Step 3 of 3 · Generate
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
              Generation
            </h1>
            <p className="mt-1 truncate text-sm text-white/45">{page.projectName}</p>
          </div>
          <p
            className="shrink-0 rounded-full border border-[#d4f26a]/30 bg-[#d4f26a]/10 px-2.5 py-1 text-xs font-medium text-[#d4f26a]"
            role="status"
          >
            Project ready
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="How to use this export">
          {[
            { step: "01", title: "Choose tools", body: "Pick Cursor, Qoder, Claude, or AGENTS.md." },
            { step: "02", title: "Download ZIP", body: "Rules, PRD, ERD, and jobs land in one archive." },
            { step: "03", title: "Paste jobs", body: "Unzip into the repo, then copy each prompt in order." },
          ].map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-white/8 bg-[#101010]/70 px-4 py-3"
            >
              <p className="font-mono text-[11px] text-[#d4f26a]">{item.step}</p>
              <p className="mt-1 text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-sm leading-6 text-white/40">{item.body}</p>
            </li>
          ))}
        </ol>

        <section aria-labelledby="targets-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
                Step 01
              </p>
              <h2 id="targets-heading" className="mt-1 text-lg font-medium">
                Targets
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Choose the tools that should receive this spec. PRD.md and
                ERD.md are always included.
              </p>
            </div>
            <p className="text-sm text-white/45" role="status">
              {selected.length} {selected.length === 1 ? "target" : "targets"} selected
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {GENERATION_TARGET_DEFINITIONS.map((target) => {
              const checked = selected.includes(target.id);
              return (
                <label
                  key={target.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                    checked
                      ? "border-[#d4f26a]/40 bg-[#d4f26a]/8"
                      : "border-white/8 bg-[#101010]/80 hover:border-white/16"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={generating}
                    onChange={() => toggleTarget(target.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                      checked
                        ? "border-[#d4f26a] bg-[#d4f26a] text-[#14160c]"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {checked ? (
                      <svg viewBox="0 0 12 12" className="size-3" fill="none">
                        <path
                          d="M2.5 6.2 4.8 8.5 9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{target.name}</span>
                    <span className="mt-1 block text-sm leading-6 text-white/45">
                      {target.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: "PRD.md",
                body: "Full product brief: personas, journey, stories, and architecture.",
              },
              {
                name: "ERD.md",
                body: "Visual data model with fields, keys, and relationships.",
              },
            ].map((doc) => (
              <div
                key={doc.name}
                className="rounded-2xl border border-white/8 bg-[#101010]/50 px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                  Always included
                </p>
                <p className="mt-1 text-sm font-medium">{doc.name}</p>
                <p className="mt-1 text-sm leading-6 text-white/45">{doc.body}</p>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <p
            className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {error.message}
          </p>
        ) : null}

        {result ? (
          <section aria-labelledby="files-heading" className="space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
                Step 02
              </p>
              <h2 id="files-heading" className="mt-1 text-lg font-medium">
                Generated files
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Preview a file, then download the ZIP from the bar below.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
              <ul className="space-y-4 rounded-2xl border border-white/8 bg-[#101010]/80 p-3">
                {[
                  ...(result.docs.length
                    ? [{ id: "docs", label: "Docs", files: result.docs }]
                    : []),
                  ...result.targets.map((target) => ({
                    id: target.target,
                    label: targetLabel(target.target),
                    files: target.files,
                  })),
                ].map((group) => (
                  <li key={group.id}>
                    <h3 className="px-2 text-xs font-medium uppercase tracking-[0.14em] text-white/40">
                      {group.label}
                    </h3>
                    <ul className="mt-1.5 space-y-0.5">
                      {group.files.map((file) => {
                        const active = preview?.path === file.path;
                        return (
                          <li key={`${group.id}:${file.path}`}>
                            <button
                              type="button"
                              className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                                active
                                  ? "bg-[#d4f26a]/12 text-[#d4f26a]"
                                  : "text-white/70 hover:bg-white/5 hover:text-white"
                              }`}
                              onClick={() =>
                                setPreview({
                                  target: group.id,
                                  path: file.path,
                                  content: file.content,
                                })
                              }
                            >
                              <span className="block truncate">{file.path}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>

              {preview ? (
                <section
                  aria-labelledby="preview-heading"
                  className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[#101010]/80"
                >
                  <div className="border-b border-white/8 px-4 py-3">
                    <h3 id="preview-heading" className="text-sm font-medium">
                      Preview
                    </h3>
                    <p className="mt-1 truncate font-mono text-xs text-white/40">
                      {preview.path}
                    </p>
                  </div>
                  {preview.path.endsWith("PRD.md") || preview.path.endsWith("ERD.md") ? (
                    <GenerationDocPreview
                      path={preview.path}
                      content={preview.content}
                      prd={result.prd}
                      erd={result.erd}
                    />
                  ) : (
                    <pre
                      aria-label={`Preview of ${preview.path}`}
                      className="max-h-112 overflow-auto p-4 font-mono text-xs leading-6 text-white/80 scrollbar-thin"
                    >
                      {preview.content}
                    </pre>
                  )}
                </section>
              ) : null}
            </div>

            <section
              aria-labelledby="checks-heading"
              className="space-y-3 rounded-2xl border border-white/8 bg-[#101010]/80 p-4"
            >
              <h3 id="checks-heading" className="text-sm font-medium">
                Generation checks
              </h3>
              <ul className="flex flex-wrap gap-2">
                {result.checks.map((check) => (
                  <li
                    key={check.id}
                    className={`rounded-full border px-2.5 py-1 text-sm ${
                      check.passed
                        ? "border-white/10 bg-white/5 text-white/70"
                        : "border-rose-300/20 bg-rose-400/10 text-rose-200"
                    }`}
                  >
                    {check.passed ? "✓" : "×"} {check.label}
                  </li>
                ))}
              </ul>
              {result.diagnostics.some((item) => item.severity === "error") ? (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-rose-200">
                    Blocking issues
                  </h4>
                  <ul className="space-y-1 text-sm text-rose-200">
                    {result.diagnostics
                      .filter((item) => item.severity === "error")
                      .map((item, index) => (
                        <li key={`${item.message}-${String(index)}`} role="alert">
                          {item.message}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {result.diagnostics.some((item) => item.severity !== "error") ? (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-white/70">Warnings</h4>
                  <ul className="space-y-1 text-sm text-white/45">
                    {result.diagnostics
                      .filter((item) => item.severity !== "error")
                      .map((item, index) => (
                        <li key={`${item.message}-${String(index)}`}>
                          {item.message}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section
              aria-labelledby="unpack-heading"
              className="rounded-2xl border border-[#d4f26a]/20 bg-[#d4f26a]/6 p-4"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4f26a]">
                In your repo
              </p>
              <h3 id="unpack-heading" className="mt-1 text-sm font-medium">
                Use this export
              </h3>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                <li>1. Unzip into the project root. Keep folder names as-is.</li>
                <li>2. You should see `.cursor/`, `docs/`, and `jobs/`.</li>
                <li>3. Open Cursor and paste Job 01. Finish it before Job 02.</li>
              </ol>
            </section>
          </section>
        ) : null}

        <GenerationJobs jobs={result?.jobs ?? page.jobs} />
      </div>

      <div className="sticky bottom-0 z-20 border-t border-white/8 bg-[#0c0c0c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            {selected.length === 0
              ? "Select at least one tool to generate files."
              : result
                ? "ZIP is ready. Download it, then paste the jobs below."
                : `Generate ${selected.length === 1 ? "1 target" : `${String(selected.length)} targets`} and a job list.`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {result ? (
              <a
                href={`/api/projects/${page.projectId}/export?targets=${exportQuery(result.selectedTargets)}`}
                className={`${ghostButtonClass} rounded-full px-5 py-2.5`}
                aria-busy={downloading}
                onClick={() => {
                  setDownloading(true);
                }}
              >
                {downloading ? "Preparing download..." : "Download ZIP"}
              </a>
            ) : null}
            <button
              type="button"
              disabled={generating || selected.length === 0}
              onClick={() => {
                void generate();
              }}
              className={primaryButtonClass}
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
