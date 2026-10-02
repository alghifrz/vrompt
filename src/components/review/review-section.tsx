import type { ReactNode } from "react";

export function ReviewSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-md border border-zinc-200 dark:border-zinc-800"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-xs font-normal text-zinc-500">Toggle</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        {children}
      </div>
    </details>
  );
}
