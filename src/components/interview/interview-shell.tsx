import type { ReactNode } from "react";

export function InterviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
