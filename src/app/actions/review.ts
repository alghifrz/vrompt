"use server";

import { redirect } from "next/navigation";
import { toSafeReviewError } from "../../lib/review/safe-error";
import type { ReviewViewError, ReviewViewModel } from "../../lib/review/view-model";
import { isReviewAuthFailure } from "../../server/application/review-flow";
import { getReviewFlow } from "../../server/runtime";

export type SaveReviewResult =
  | { ok: true; view: ReviewViewModel }
  | { ok: false; error: ReviewViewError };

export async function saveReviewAction(input: {
  projectId: string;
  spec: unknown;
}): Promise<SaveReviewResult> {
  try {
    return await getReviewFlow().save({
      projectId: input.projectId,
      spec: input.spec,
    });
  } catch (error) {
    if (isReviewAuthFailure(error)) {
      redirect("/sign-in");
    }

    return {
      ok: false,
      error: toSafeReviewError(error),
    };
  }
}
