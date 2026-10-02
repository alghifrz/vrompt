"use client";

import { saveReviewAction } from "../../app/actions/review";
import type { ReviewViewModel } from "../../lib/review/view-model";
import { ReviewEditor } from "./review-editor";

export function BoundReviewEditor({
  initialView,
}: {
  initialView: ReviewViewModel;
}) {
  return (
    <ReviewEditor initialView={initialView} saveReview={saveReviewAction} />
  );
}
