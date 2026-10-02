import type { ProjectStatus } from "../../core/schema/project-spec";
import { displayProjectName } from "../interview/view-model";

export const WORKSPACE_PROJECT_NAME_MAX = 80;

export const WORKSPACE_STAGES = ["interview", "review", "generate"] as const;
export type WorkspaceStage = (typeof WORKSPACE_STAGES)[number];

export const WORKSPACE_STAGE_LABELS: Record<WorkspaceStage, string> = {
  interview: "Interview",
  review: "Review",
  generate: "Generate",
};

export const WORKSPACE_STAGE_HINTS: Record<WorkspaceStage, string> = {
  interview: "Answer the questions",
  review: "Check the spec",
  generate: "Download the ZIP",
};

export interface WorkspaceProject {
  readonly id: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly stage: WorkspaceStage;
  readonly href: string;
}

export type ParsedProjectName =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "too_long" };

export function parseWorkspaceProjectName(value: string): ParsedProjectName {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    return { ok: false, reason: "empty" };
  }
  if (name.length > WORKSPACE_PROJECT_NAME_MAX) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, name };
}

export function workspaceStage(status: ProjectStatus): WorkspaceStage {
  return status === "ready" ? "generate" : "interview";
}

export function workspaceProjectHref(id: string, stage: WorkspaceStage): string {
  if (stage === "generate") {
    return `/generate/${id}`;
  }
  if (stage === "review") {
    return `/review/${id}`;
  }
  return `/interview/${id}`;
}

export function workspaceFlowHref(projectId: string, stage: WorkspaceStage): string {
  return workspaceProjectHref(projectId, stage);
}

export function toWorkspaceProject(input: {
  id: string;
  name: string;
  status: ProjectStatus;
}): WorkspaceProject {
  const stage = workspaceStage(input.status);
  return {
    id: input.id,
    name: displayProjectName(input.name),
    status: input.status,
    stage,
    href: workspaceProjectHref(input.id, stage),
  };
}
