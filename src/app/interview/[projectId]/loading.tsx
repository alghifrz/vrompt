import { AppShell } from "../../../components/app/app-shell";
import { InterviewShell } from "../../../components/interview/interview-shell";

function Bar({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-white/[0.07] motion-safe:animate-pulse ${className}`}
    />
  );
}

export default function InterviewLoading() {
  return (
    <AppShell title="Interview" currentStep={0} fill>
      <InterviewShell>
        <p role="status" className="sr-only">
          Loading interview...
        </p>
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <Bar className="h-3 w-36" />
            <Bar className="h-2.5 w-24" />
          </div>
        </div>
        <div className="flex gap-2 border-b border-white/8 px-4 py-3 sm:px-6">
          {["w-24", "w-20", "w-28", "w-20", "w-24"].map((width, index) => (
            <Bar key={String(index)} className={`h-7 ${width}`} />
          ))}
        </div>
        <div className="flex-1 space-y-5 px-4 py-6 sm:px-6">
          <Bar className="h-16 w-full max-w-sm" />
          <Bar className="ml-auto h-12 w-full max-w-[16rem]" />
        </div>
      </InterviewShell>
    </AppShell>
  );
}
