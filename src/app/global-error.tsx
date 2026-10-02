"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center bg-white px-6 py-16 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Vrompt could not recover from this error. Your previous saved work is
          still on the server.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
