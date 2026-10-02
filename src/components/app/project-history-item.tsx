"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  deleteProjectAction,
  renameProjectAction,
} from "../../app/actions/workspace";
import {
  WORKSPACE_PROJECT_NAME_MAX,
  type WorkspaceProject,
} from "../../lib/workspace/projects";

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

export function ProjectHistoryItem({
  project,
  active,
  onNavigate,
}: {
  project: WorkspaceProject;
  active: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [draft, setDraft] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(project.name);
  }, [project.name]);

  useEffect(() => {
    if (!menuOpen && mode !== "delete") return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMode("idle");
        setError(null);
      }
    }

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      setMenuOpen(false);
      if (mode === "delete") {
        setMode("idle");
        setError(null);
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuId, menuOpen, mode]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 176;
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.min(rect.right - width, window.innerWidth - width - 8),
      });
    }
    setError(null);
    setMode("idle");
    setMenuOpen((open) => !open);
  }

  function startRename() {
    setDraft(project.name);
    setError(null);
    setMenuOpen(false);
    setMode("rename");
  }

  function startDelete() {
    setError(null);
    setMenuOpen(false);
    setMode("delete");
  }

  function cancel() {
    setDraft(project.name);
    setError(null);
    setMode("idle");
    setMenuOpen(false);
  }

  function onRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameProjectAction({
        projectId: project.id,
        name: draft,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMode("idle");
      setError(null);
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteProjectAction({ projectId: project.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMode("idle");
      if (active) {
        router.push("/start");
      }
      router.refresh();
    });
  }

  if (mode === "rename") {
    return (
      <li ref={rootRef} className="rounded-xl bg-white/[0.04] px-2 py-1.5">
        <form onSubmit={onRename}>
          <label className="sr-only" htmlFor={`${menuId}-name`}>
            Project name
          </label>
          <input
            id={`${menuId}-name`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={WORKSPACE_PROJECT_NAME_MAX}
            autoFocus
            disabled={pending}
            className="w-full rounded-lg border border-[#d4f26a]/30 bg-[#101010] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#d4f26a]"
          />
          {error ? (
            <p role="alert" className="mt-1 px-0.5 text-[11px] text-red-300">
              {error}
            </p>
          ) : null}
          <div className="mt-1.5 flex justify-end gap-1">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-md px-2 py-1 text-[11px] text-white/55 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="rounded-md bg-[#d4f26a] px-2 py-1 text-[11px] font-medium text-[#14160c] disabled:opacity-50"
            >
              {pending ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  const menu =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label={`Actions for ${project.name}`}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-white/10 bg-[#161616] py-1 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={startRename}
              className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={startDelete}
              className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  const confirm =
    mode === "delete" && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4">
            <div
              ref={dialogRef}
              role="dialog"
              aria-labelledby={`${menuId}-delete-title`}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl"
            >
              <h2
                id={`${menuId}-delete-title`}
                className="text-base font-medium text-white"
              >
                Delete this project?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                <span className="text-white/80">{project.name}</span> and its
                interview answers will be removed. This cannot be undone.
              </p>
              {error ? (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {error}
                </p>
              ) : null}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Deleting" : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <li ref={rootRef} className="group relative">
      <div
        className={`flex items-center rounded-xl ${
          active
            ? "bg-[#d4f26a]/12 text-[#d4f26a]"
            : "text-white/70 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <Link
          href={project.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className="min-w-0 flex-1 rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a]"
        >
          <span className="block truncate text-sm font-medium">{project.name}</span>
          <span className="mt-0.5 block text-[11px] text-white/35">
            {project.status === "ready" ? "Ready · Generate" : "Draft · Interview"}
          </span>
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-label={`Actions for ${project.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          onClick={openMenu}
          className={`mr-1 grid size-8 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] ${
            menuOpen || active
              ? "text-current"
              : "text-white/40 hover:bg-white/10 hover:text-white"
          }`}
        >
          <DotsIcon />
        </button>
      </div>
      {menu}
      {confirm}
    </li>
  );
}
