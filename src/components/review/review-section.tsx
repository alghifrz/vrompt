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
      className="group overflow-hidden rounded-2xl border border-white/8 bg-[#101010]/80"
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="inline-flex text-white/40">
            <svg
              viewBox="0 0 16 16"
              className="size-4 transition-transform duration-200 group-open:-rotate-180"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">Toggle</span>
          </span>
        </span>
      </summary>
      <div className="space-y-5 border-t border-white/8 px-5 py-5">
        {children}
      </div>
    </details>
  );
}
