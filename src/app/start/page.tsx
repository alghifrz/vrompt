import type { Metadata } from "next";
import Link from "next/link";
import { startInterviewAction } from "../actions/interview";
import { StartSubmitButton } from "../../components/start-submit-button";

export const metadata: Metadata = {
  title: "Start",
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm text-zinc-500">Interview → Review → Generate</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Start a project
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Vrompt will ask a structured series of questions about your project,
        then turn your answers into a validated project specification.
      </p>
      {error === "start" ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
          The project could not be created. Please try again.
        </p>
      ) : null}
      <form action={startInterviewAction} className="mt-8">
        <StartSubmitButton />
      </form>
      <Link
        href="/"
        className="mt-6 text-sm text-zinc-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
      >
        ← Back to Vrompt
      </Link>
    </main>
  );
}
