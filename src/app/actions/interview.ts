"use server";

import { redirect } from "next/navigation";
import { isAuthFailure } from "../../server/application/interview-flow";
import { getInterviewFlow } from "../../server/runtime";
import type { InterviewViewModel } from "../../lib/interview/view-model";
import { toSafeInterviewError } from "../../lib/interview/safe-error";

export async function startInterviewAction(): Promise<void> {
  try {
    const result = await getInterviewFlow().startProject();
    if (!result.ok) {
      redirect("/start?error=start");
    }
    redirect(`/interview/${result.view.projectId}`);
  } catch (error) {
    if (isAuthFailure(error)) {
      redirect("/sign-in");
    }
    throw error;
  }
}

export async function submitInterviewAnswerAction(input: {
  projectId: string;
  sessionId: string;
  answer: string;
}): Promise<{ ok: true; view: InterviewViewModel } | { ok: false; error: NonNullable<InterviewViewModel["error"]> }> {
  try {
    return await getInterviewFlow().submitAnswer(input);
  } catch (error) {
    if (isAuthFailure(error)) {
      redirect("/sign-in");
    }

    return {
      ok: false,
      error: toSafeInterviewError(error),
    };
  }
}
