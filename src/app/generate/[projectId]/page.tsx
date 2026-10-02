import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../components/app/app-shell";
import { BoundGenerationEditor } from "../../../components/generation/bound-generation-editor";
import { isGenerationAuthFailure } from "../../../server/application/generation-flow";
import { loadWorkspaceProjects } from "../../../server/application/workspace";
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
  const projects = await loadWorkspaceProjects();

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

  return (
    <AppShell
      title={result.view.projectName}
      currentStep={2}
      currentProjectId={projectId}
      projects={projects}
    >
      <BoundGenerationEditor page={result.view} />
    </AppShell>
  );
}
