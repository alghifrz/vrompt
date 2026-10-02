"use client";

import Link from "next/link";
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
  const [view, setView] = useState(initialView);
  const [spec, setSpec] = useState(initialView.spec);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ReviewViewError | undefined>();
  const [fields, setFields] = useState<readonly ReviewFieldError[]>([]);

  const dirty = specsDiffer(spec, view.spec);
  const parsed = useMemo(() => parseReviewSpec(spec), [spec]);
  const valid = parsed.success;
  const saveLabel = saving ? "Saving..." : "Save changes";

  async function save() {
    if (saving || !dirty) {
      return;
    }

    setSaving(true);
    try {
      const result = await saveReview({
        projectId: view.projectId,
        spec,
      });

      if (result.ok) {
        setView(result.view);
        setSpec(result.view.spec);
        setError(undefined);
        setFields([]);
        return;
      }

      setError(result.error);
      setFields(result.error.fields ?? []);
    } catch {
      setError({
        code: "SERVER_ERROR",
        message: "Unable to save. Your edits are still in the editor.",
        retryable: true,
      });
    } finally {
      setSaving(false);
    }
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

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
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

        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {view.isReady && !dirty ? (
            <Link
              href={`/generate/${view.projectId}`}
              className={`${primaryButtonClass} inline-flex`}
            >
              Continue to generation
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                className={primaryButtonClass}
                title="Save a ready specification before generating."
              >
                Continue to generation
              </button>
              <p className="mt-2 text-sm text-zinc-500">
                Save a valid specification and mark it ready before generating
                configuration.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
