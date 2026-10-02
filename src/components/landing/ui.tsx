import type { ReactNode } from "react";
import { BrandMark } from "../brand-mark";
import { eyebrowClass, mutedClass, sectionTitleClass } from "./styles";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={eyebrowClass}>{eyebrow}</p>
      <h2 className={`${sectionTitleClass} mt-3`}>{title}</h2>
      {description ? <p className={`${mutedClass} mt-4`}>{description}</p> : null}
    </div>
  );
}

export function WindowFrame({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_28px_80px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="ml-2 truncate text-[11px] text-white/40">{title}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 8.2 6.4 11.1 12.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 leading-none">
      <BrandMark className="size-8 shrink-0" />
      {compact ? (
        <span className="sr-only">Vrompt</span>
      ) : (
        <span className="landing-display -translate-y-px text-[1.35rem] leading-none tracking-tight text-[#f3f3ee] sm:text-[1.45rem]">
          Vrompt
        </span>
      )}
    </span>
  );
}
