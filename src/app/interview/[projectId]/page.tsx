import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BoundInterviewConversation } from "../../../components/interview/bound-interview-conversation";
import { isAuthFailure } from "../../../server/application/interview-flow";
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
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
      <BoundInterviewConversation initialView={result.view} />
    </main>
  );
}
