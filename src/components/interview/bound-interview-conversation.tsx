"use client";

import { submitInterviewAnswerAction } from "../../app/actions/interview";
import type { InterviewViewModel } from "../../lib/interview/view-model";
import { InterviewConversation } from "./interview-conversation";

export function BoundInterviewConversation({
  initialView,
}: {
  initialView: InterviewViewModel;
}) {
  return (
    <InterviewConversation
      initialView={initialView}
      submitAnswer={submitInterviewAnswerAction}
    />
  );
}
