import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../components/app/app-shell";
import { BoundInterviewConversation } from "../../../components/interview/bound-interview-conversation";
import { InterviewShell } from "../../../components/interview/interview-shell";
import { isAuthFailure } from "../../../server/application/interview-flow";
import { loadWorkspaceProjects } from "../../../server/application/workspace";
import { getInterviewFlow } from "../../../server/runtime";

export const metadata: Metadata = {
  title: "Interview",
};

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projects = await loadWorkspaceProjects();

  let result;
  try {
    result = await getInterviewFlow().loadInterview(projectId);
  } catch (error) {
    if (isAuthFailure(error)) {
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
      currentStep={0}
      currentProjectId={projectId}
      projects={projects}
      fill
    >
      <InterviewShell>
        <BoundInterviewConversation initialView={result.view} />
      </InterviewShell>
    </AppShell>
  );
}
