import { z } from "zod";
import {
  ProjectSpecSchema,
  type ProjectSpec,
  type ProjectStatus,
} from "../../core/schema/project-spec";

export interface ReviewFieldError {
  readonly path: string;
  readonly message: string;
}

export interface ReviewViewError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly fields?: readonly ReviewFieldError[];
}

export interface ReviewViewModel {
  readonly projectId: string;
  readonly spec: ProjectSpec;
  readonly canEdit: boolean;
  readonly isReady: boolean;
  readonly status: ProjectStatus;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  ready: "Ready for generation",
  archived: "Archived",
};

export function toReviewViewModel(input: {
  projectId: string;
  spec: ProjectSpec;
}): ReviewViewModel {
  return {
    projectId: input.projectId,
    spec: input.spec,
    canEdit: true,
    isReady: input.spec.project.status === "ready",
    status: input.spec.project.status,
  };
}

export function nextReviewId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function specsDiffer(left: ProjectSpec, right: ProjectSpec): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export function parseReviewSpec(value: unknown): {
  success: true;
  spec: ProjectSpec;
} | {
  success: false;
  fields: ReviewFieldError[];
} {
  const parsed = ProjectSpecSchema.safeParse(value);
  if (parsed.success) {
    return { success: true, spec: parsed.data };
  }

  return {
    success: false,
    fields: toReviewFieldErrors(parsed.error),
  };
}

export function toReviewFieldErrors(error: z.ZodError): ReviewFieldError[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return {
      path,
      message: friendlyReviewMessage(path, issue.message),
    };
  });
}

export function fieldError(
  errors: readonly ReviewFieldError[] | undefined,
  path: string,
): string | undefined {
  return errors?.find((error) => error.path === path)?.message;
}

export function errorsForPrefix(
  errors: readonly ReviewFieldError[] | undefined,
  prefix: string,
): ReviewFieldError[] {
  if (!errors) {
    return [];
  }

  return errors.filter(
    (error) => error.path === prefix || error.path.startsWith(`${prefix}.`),
  );
}

export function moveItem<T>(items: readonly T[], index: number, offset: number): T[] {
  const next = [...items];
  const target = index + offset;
  if (target < 0 || target >= next.length) {
    return next;
  }

  const [item] = next.splice(index, 1);
  if (item === undefined) {
    return next;
  }

  next.splice(target, 0, item);
  return next;
}

export function replaceItem<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((current, currentIndex) =>
    currentIndex === index ? item : current,
  );
}

export function removeItem<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, currentIndex) => currentIndex !== index);
}

function friendlyReviewMessage(path: string, message: string): string {
  if (path === "project.name" && isRequiredMessage(message)) {
    return "Project name is required.";
  }

  if (path.endsWith(".path") && /start with/i.test(message)) {
    return 'API path must start with "/".';
  }

  if (/duplicate feature id/i.test(message)) {
    return "Feature IDs must be unique.";
  }

  if (path.includes("globs") && isRequiredMessage(message)) {
    return "Scoped AI rules require at least one glob.";
  }

  return message;
}

function isRequiredMessage(message: string): boolean {
  return /too small|required|at least|expected string to have >=1/i.test(message);
}
