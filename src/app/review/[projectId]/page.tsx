import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BoundReviewEditor } from "../../../components/review/bound-review-editor";
import { isReviewAuthFailure } from "../../../server/application/review-flow";
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
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          Project Specification
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400" role="alert">
          {result.error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col">
      <BoundReviewEditor initialView={result.view} />
    </main>
  );
}
