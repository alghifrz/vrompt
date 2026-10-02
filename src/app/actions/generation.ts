"use server";

import { redirect } from "next/navigation";
import { toSafeGenerationError } from "../../lib/generation/safe-error";
import type {
  GenerationResultView,
  GenerationViewError,
} from "../../lib/generation/view-model";
import { isGenerationAuthFailure } from "../../server/application/generation-flow";
import { getGenerationFlow } from "../../server/runtime";

export async function generateProjectAction(input: {
  projectId: string;
  targets: readonly string[];
}): Promise<
  | { ok: true; view: GenerationResultView }
  | { ok: false; error: GenerationViewError }
> {
  try {
    return await getGenerationFlow().generate({
      projectId: input.projectId,
      targets: input.targets,
    });
  } catch (error) {
    if (isGenerationAuthFailure(error)) {
      redirect("/sign-in");
    }

    return {
      ok: false,
      error: toSafeGenerationError(error),
    };
  }
}
