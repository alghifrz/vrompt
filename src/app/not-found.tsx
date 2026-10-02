import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Page not available</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        This project could not be opened. It may not exist, or you may not have
        access to it.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        Back to Vrompt
      </Link>
    </main>
  );
}
