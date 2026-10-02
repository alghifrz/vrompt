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
import { primaryButtonClass } from "../review/form-controls";

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
  const [selected, setSelected] = useState<GenerationTarget[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResultView | undefined>();
  const [error, setError] = useState<GenerationViewError | undefined>();
  const [preview, setPreview] = useState<{ target: string; path: string; content: string }>();
  const [downloading, setDownloading] = useState(false);

  if (!page.ready) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Generation</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400" role="alert">
          This project is not ready for generation. Return to Review and mark
          the project as ready.
        </p>
        <Link
          href={`/review/${page.projectId}`}
          className="mt-6 text-sm underline underline-offset-4"
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
        const first = next.view.targets[0]?.files[0];
        setPreview(
          first
            ? {
                target: next.view.targets[0]!.target,
                path: first.path,
                content: first.content,
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col">
      <header className="border-b border-zinc-200 px-4 py-5 dark:border-zinc-800 sm:px-6">
        <Link
          href={`/review/${page.projectId}`}
          className="text-sm text-zinc-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
        >
          Back to review
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Generation</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Generate coding-agent configuration from your approved specification.
        </p>
        <p className="mt-3 text-sm font-medium" role="status">
          Project ready
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <section aria-labelledby="targets-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="targets-heading" className="text-lg font-medium">
              Targets
            </h2>
            <p className="text-sm text-zinc-500" role="status">
              {selected.length} {selected.length === 1 ? "target" : "targets"} selected
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {GENERATION_TARGET_DEFINITIONS.map((target) => {
              const checked = selected.includes(target.id);
              return (
                <label
                  key={target.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 ${
                    checked
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={generating}
                    onChange={() => {
                      setSelected((current) =>
                        current.includes(target.id)
                          ? current.filter((id) => id !== target.id)
                          : [...current, target.id],
                      );
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">{target.name}</span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      {target.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
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
        </section>

        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {error.message}
          </p>
        ) : null}

        {result ? (
          <section aria-labelledby="files-heading" className="space-y-4">
            <h2 id="files-heading" className="text-lg font-medium">
              Generated files
            </h2>
            <ul className="space-y-4">
              {result.targets.map((target) => (
                <li key={target.target}>
                  <h3 className="text-sm font-medium">
                    {targetLabel(target.target)}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {target.files.map((file) => (
                      <li key={`${target.target}:${file.path}`}>
                        <button
                          type="button"
                          className="text-left text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
                          onClick={() =>
                            setPreview({
                              target: target.target,
                              path: file.path,
                              content: file.content,
                            })
                          }
                        >
                          {file.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {preview ? (
              <section aria-labelledby="preview-heading" className="space-y-2">
                <h3 id="preview-heading" className="text-sm font-medium">
                  Preview
                </h3>
                <p className="text-xs text-zinc-500">{preview.path}</p>
                <pre
                  aria-label={`Preview of ${preview.path}`}
                  className="max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {preview.content}
                </pre>
              </section>
            ) : null}

            <section aria-labelledby="checks-heading" className="space-y-2">
              <h3 id="checks-heading" className="text-sm font-medium">
                Generation checks
              </h3>
              <ul className="space-y-1 text-sm">
                {result.checks.map((check) => (
                  <li key={check.id}>
                    {check.passed ? "✓" : "×"} {check.label}
                  </li>
                ))}
              </ul>
              {result.diagnostics.some((item) => item.severity === "error") ? (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                    Blocking issues
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
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
                  <h4 className="text-sm font-medium">Warnings</h4>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
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

            <a
              href={`/api/projects/${page.projectId}/export?targets=${exportQuery(result.selectedTargets)}`}
              className={`${primaryButtonClass} inline-flex`}
              aria-busy={downloading}
              onClick={() => {
                setDownloading(true);
              }}
            >
              {downloading ? "Preparing download..." : "Download ZIP"}
            </a>
          </section>
        ) : null}
      </div>
    </div>
  );
}
