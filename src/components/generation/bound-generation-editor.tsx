"use client";

import { generateProjectAction } from "../../app/actions/generation";
import type { GenerationPageView } from "../../lib/generation/view-model";
import { GenerationEditor } from "./generation-editor";

export function BoundGenerationEditor({ page }: { page: GenerationPageView }) {
  return (
    <GenerationEditor page={page} generateProject={generateProjectAction} />
  );
}
