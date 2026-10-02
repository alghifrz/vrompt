"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProjectSpec } from "../../core/schema/project-spec";
import {
  parseReviewSpec,
  specsDiffer,
  type ReviewFieldError,
  type ReviewViewError,
  type ReviewViewModel,
} from "../../lib/review/view-model";
import { primaryButtonClass } from "./form-controls";
import { ReviewHeader } from "./review-header";
import { ReviewSections } from "./review-sections";

export type SaveReview = (input: {
  projectId: string;
  spec: ProjectSpec;
}) => Promise<
  | { ok: true; view: ReviewViewModel }
  | { ok: false; error: ReviewViewError }
>;

export function ReviewEditor({
  initialView,
  saveReview,
}: {
  initialView: ReviewViewModel;
  saveReview: SaveReview;
}) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [spec, setSpec] = useState(initialView.spec);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ReviewViewError | undefined>();
  const [fields, setFields] = useState<readonly ReviewFieldError[]>([]);

  const dirty = specsDiffer(spec, view.spec);
  const parsed = useMemo(() => parseReviewSpec(spec), [spec]);
  const valid = parsed.success;
  const saveLabel = saving ? "Saving..." : "Save changes";
  const canContinue = valid && !saving;
  const alreadyReady = view.spec.project.status === "ready" && !dirty;

  async function persist(nextSpec: ProjectSpec): Promise<boolean> {
    setSaving(true);
    try {
      const result = await saveReview({
        projectId: view.projectId,
        spec: nextSpec,
      });

      if (result.ok) {
        setView(result.view);
        setSpec(result.view.spec);
        setError(undefined);
        setFields([]);
        return true;
      }

      setError(result.error);
      setFields(result.error.fields ?? []);
      return false;
    } catch {
      setError({
        code: "SERVER_ERROR",
        message: "Unable to save. Your edits are still in the editor.",
        retryable: true,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (saving || !dirty) {
      return;
    }

    await persist(spec);
  }

  async function continueToGeneration() {
    if (!canContinue || alreadyReady) {
      return;
    }

    const nextSpec =
      spec.project.status === "ready"
        ? spec
        : {
            ...spec,
            project: { ...spec.project, status: "ready" as const },
          };

    if (specsDiffer(nextSpec, view.spec)) {
      const saved = await persist(nextSpec);
      if (!saved) {
        return;
      }
    }

    router.push(`/generate/${view.projectId}`);
  }

  const statusView: ReviewViewModel = {
    ...view,
    spec,
    status: spec.project.status,
    isReady: valid && spec.project.status === "ready",
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ReviewHeader
        view={statusView}
        dirty={dirty}
        saving={saving}
        saveLabel={saveLabel}
        valid={valid}
        onSave={() => {
          void save();
        }}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        {error ? (
          <p
            className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {error.message}
          </p>
        ) : null}

        <ReviewSections
          spec={spec}
          disabled={saving}
          errors={fields}
          onChange={(next) => {
            setSpec(next);
            setError(undefined);
          }}
        />
      </div>

      <div className="sticky bottom-0 z-20 border-t border-white/8 bg-[#0c0c0c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            {!valid
              ? "Fix the fields that need attention before generating."
              : "Looks good? Generate Cursor, Qoder, and Claude config next."}
          </p>
          {alreadyReady ? (
            <Link
              href={`/generate/${view.projectId}`}
              className={`${primaryButtonClass} inline-flex`}
            >
              Continue to generation
            </Link>
          ) : (
            <button
              type="button"
              disabled={!canContinue}
              className={primaryButtonClass}
              onClick={() => {
                void continueToGeneration();
              }}
            >
              Continue to generation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
