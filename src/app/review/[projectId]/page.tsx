import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../components/app/app-shell";
import { BoundReviewEditor } from "../../../components/review/bound-review-editor";
import { displayProjectName } from "../../../lib/interview/view-model";
import { isReviewAuthFailure } from "../../../server/application/review-flow";
import { loadWorkspaceProjects } from "../../../server/application/workspace";
import { getReviewFlow } from "../../../server/runtime";

export const metadata: Metadata = {
  title: "Review",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projects = await loadWorkspaceProjects();

  let result;
  try {
    result = await getReviewFlow().load(projectId);
  } catch (error) {
    if (isReviewAuthFailure(error)) {
      redirect("/sign-in");
    }
    throw error;
  }

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      notFound();
    }

    return (
      <AppShell title="Review" currentStep={1} currentProjectId={projectId} projects={projects}>
        <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
          <h1 className="text-2xl font-semibold tracking-tight">
            Project Specification
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55" role="alert">
            {result.error.message}
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={displayProjectName(result.view.spec.project.name)}
      currentStep={1}
      currentProjectId={projectId}
      projects={projects}
    >
      <BoundReviewEditor initialView={result.view} />
    </AppShell>
  );
}
