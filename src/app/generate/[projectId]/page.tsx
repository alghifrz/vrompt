import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BoundGenerationEditor } from "../../../components/generation/bound-generation-editor";
import { isGenerationAuthFailure } from "../../../server/application/generation-flow";
import { getGenerationFlow } from "../../../server/runtime";

export const metadata: Metadata = {
  title: "Generate",
};

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  let result;
  try {
    result = await getGenerationFlow().load(projectId);
  } catch (error) {
    if (isGenerationAuthFailure(error)) {
      redirect("/sign-in");
    }
    throw error;
  }

  if (!result.ok) {
    notFound();
  }

  return <BoundGenerationEditor page={result.view} />;
}
