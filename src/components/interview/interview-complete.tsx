import Link from "next/link";

export function InterviewComplete({ projectId }: { projectId: string }) {
  return (
    <section className="border-t border-zinc-200 px-4 py-6 dark:border-zinc-800">
      <h2 className="text-lg font-medium">Interview complete</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Your project specification has been collected. Review comes next.
      </p>
      <Link
        href={`/review/${projectId}`}
        className="mt-4 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        Review specification
      </Link>
    </section>
  );
}
