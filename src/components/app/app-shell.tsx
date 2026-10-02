"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  WORKSPACE_STAGE_HINTS,
  WORKSPACE_STAGE_LABELS,
  WORKSPACE_STAGES,
  workspaceFlowHref,
  type WorkspaceProject,
} from "../../lib/workspace/projects";
import { AccountCard } from "../auth/account-card";
import { SignOutButton, signOutButtonClass } from "../auth/sign-out-button";
import { BrandMark } from "../brand-mark";
import { landingEase, useLandingMotion } from "../landing/motion";
import { ProjectHistoryItem } from "./project-history-item";

const workflow = WORKSPACE_STAGES.map((id) => ({
  id,
  label: WORKSPACE_STAGE_LABELS[id],
  hint: WORKSPACE_STAGE_HINTS[id],
}));

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/* ---------- Brand ---------- */

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/start"
      onClick={onNavigate}
      className="group flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4f26a]"
    >
      <BrandMark className="size-9 shadow-[0_0_24px_-4px_rgba(212,242,106,0.6)] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105" />
      <span>
        <span className="block text-sm font-semibold leading-tight">Vrompt</span>
        <span className="block text-[11px] text-white/40">Workspace</span>
      </span>
    </Link>
  );
}

/* ---------- Stepper vertikal ---------- */

function FlowList({
  currentStep,
  currentProjectId,
  onNavigate,
}: {
  currentStep: number;
  currentProjectId?: string;
  onNavigate?: () => void;
}) {
  const enabled = useLandingMotion();

  return (
    <ol className="mt-2" aria-label="Project flow">
      {workflow.map((item, index) => {
        const done = index < currentStep;
        const current = index === currentStep;
        const last = index === workflow.length - 1;
        const href = currentProjectId
          ? workspaceFlowHref(currentProjectId, item.id)
          : undefined;

        return (
          <li
            key={item.label}
            aria-current={current ? "step" : undefined}
            className="relative"
          >
            {href ? (
              <Link
                href={href}
                onClick={onNavigate}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
              >
                <FlowMarker
                  done={done}
                  current={current}
                  last={last}
                  index={index}
                  enabled={enabled}
                />
                <FlowCopy item={item} current={current} />
              </Link>
            ) : (
              <div className="relative flex items-center gap-3 rounded-xl px-3 py-2">
                <FlowMarker
                  done={done}
                  current={current}
                  last={last}
                  index={index}
                  enabled={enabled}
                />
                <FlowCopy item={item} current={current} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FlowMarker({
  done,
  current,
  last,
  index,
  enabled,
}: {
  done: boolean;
  current: boolean;
  last: boolean;
  index: number;
  enabled: boolean;
}) {
  return (
    <>
      {!last ? (
        <span
          aria-hidden="true"
          className={`absolute bottom-[-0.5rem] left-[23.5px] top-8 w-px ${
            done ? "bg-[#d4f26a]/60" : "bg-white/10"
          }`}
        />
      ) : null}
      <span className="relative z-10 grid size-6 shrink-0 place-items-center">
        {current && enabled ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[#d4f26a]/30"
            animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <span
          className={`relative grid size-6 place-items-center rounded-full border font-mono text-[10px] font-semibold transition-colors ${
            done || current
              ? "border-[#d4f26a] bg-[#d4f26a] text-[#14160c]"
              : "border-white/15 bg-[#101010] text-white/40"
          }`}
        >
          {done ? "✓" : String(index + 1).padStart(2, "0")}
        </span>
      </span>
    </>
  );
}

function FlowCopy({
  item,
  current,
}: {
  item: { label: string; hint: string };
  current: boolean;
}) {
  return (
    <span>
      <span
        className={`block text-sm ${
          current ? "font-medium text-white" : "text-white/60"
        }`}
      >
        {item.label}
      </span>
      <span className="block text-xs text-white/30">{item.hint}</span>
    </span>
  );
}

/* ---------- Isi sidebar (dipakai desktop & drawer mobile) ---------- */

function SidebarBody({
  currentStep,
  currentProjectId,
  projects,
  onNavigate,
}: {
  currentStep: number;
  currentProjectId?: string;
  projects: readonly WorkspaceProject[];
  onNavigate?: () => void;
}) {
  const creating = !currentProjectId;

  return (
    <>
      <div className="px-5 py-5">
        <Brand onNavigate={onNavigate} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Workspace">
        <p className="px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
          Project
        </p>
        <Link
          href="/start"
          onClick={onNavigate}
          aria-current={creating ? "page" : undefined}
          className={`relative mt-2 flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] ${
            creating
              ? "border border-[#d4f26a]/20 bg-gradient-to-r from-[#d4f26a]/[0.14] to-[#d4f26a]/[0.03] text-[#d4f26a]"
              : "border border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          {creating ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#d4f26a] shadow-[0_0_12px_rgba(212,242,106,0.7)]"
            />
          ) : null}
          <span aria-hidden="true" className="grid size-5 place-items-center rounded-md bg-[#d4f26a]/15 text-sm leading-none text-[#d4f26a]">
            +
          </span>
          New project
        </Link>

        <p className="mt-7 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
          History
        </p>
        {projects.length === 0 ? (
          <p className="mt-2 px-3 text-xs leading-5 text-white/35">
            Projects you create will show up here.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {projects.map((project) => (
              <ProjectHistoryItem
                key={project.id}
                project={project}
                active={project.id === currentProjectId}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}

        <p className="mt-7 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
          Flow
        </p>
        <FlowList
          currentStep={currentStep}
          currentProjectId={currentProjectId}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="space-y-3 border-t border-white/8 p-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-[#d4f26a]" />
          Free in beta
        </span>
        {clerkEnabled ? <AccountCard /> : null}
      </div>
    </>
  );
}

/* ---------- Shell ---------- */

export function AppShell({
  title,
  children,
  currentStep = -1,
  currentProjectId,
  projects = [],
  fill = false,
}: {
  title: string;
  children: ReactNode;
  /** -1 = belum mulai, 0 = Interview, 1 = Review, 2 = Generate */
  currentStep?: number;
  currentProjectId?: string;
  projects?: readonly WorkspaceProject[];
  fill?: boolean;
}) {
  const enabled = useLandingMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const { overflow: htmlOverflow } = html.style;
    const { overflow: bodyOverflow } = document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  // Drawer: Escape, auto-close di desktop, lock scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className="flex h-dvh max-h-dvh flex-1 overflow-hidden bg-[#0c0c0c] text-[#f3f3ee]"
    >
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-white/8 bg-[#0f0f0f] lg:flex">
        <SidebarBody
          currentStep={currentStep}
          currentProjectId={currentProjectId}
          projects={projects}
        />
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              id="workspace-drawer"
              aria-label="Workspace menu"
              className="relative flex h-full w-72 max-w-[85%] flex-col border-r border-white/10 bg-[#0f0f0f] shadow-2xl"
              initial={enabled ? { x: "-100%" } : false}
              animate={{ x: 0 }}
              exit={enabled ? { x: "-100%" } : undefined}
              transition={{ duration: 0.3, ease: landingEase }}
            >
              <SidebarBody
                currentStep={currentStep}
                currentProjectId={currentProjectId}
                projects={projects}
                onNavigate={() => setOpen(false)}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-70" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]"
        />

        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-[#0c0c0c] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="workspace-drawer"
              onClick={() => setOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] lg:hidden"
            >
              <span className="sr-only">Open menu</span>
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                <path d="M3 6h14M3 14h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/35">
                Workspace
                <span aria-hidden="true" className="text-white/20">/</span>
              </p>
              <p className="truncate text-sm font-medium">{title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
            >
              Marketing site
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              {clerkEnabled ? (
                <Show when="signed-in">
                  <SignOutButton className={`${signOutButtonClass} rounded-full px-3 py-1.5`} />
                  <UserButton />
                </Show>
              ) : null}
            </div>
          </div>
        </header>

        <motion.div
          className={
            fill
              ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
              : "relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
          initial={enabled ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: landingEase }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}