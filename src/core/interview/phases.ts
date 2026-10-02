import type { ProjectSpec } from "../schema/project-spec";
import {
  INTERVIEW_PHASES,
  type InterviewPhase,
  type ProjectSpecPatch,
} from "./types";

export const INITIAL_PROJECT = {
  name: "Untitled project",
  description: "This project has not been described yet.",
  problem: "The problem has not been defined yet.",
  targetUsers: ["Undetermined"],
  type: "unspecified",
  status: "draft",
} as const;

export const SKIPPABLE_PHASES: readonly InterviewPhase[] = [
  "stack",
  "architecture",
  "database",
  "api",
  "security",
  "ai_rules",
];

export function isInterviewPhase(value: string): value is InterviewPhase {
  return (INTERVIEW_PHASES as readonly string[]).includes(value);
}

export function nextPhase(phase: InterviewPhase): InterviewPhase {
  const index = INTERVIEW_PHASES.indexOf(phase);
  const following = INTERVIEW_PHASES[index + 1];
  return following ?? "complete";
}

export function isSkippable(phase: InterviewPhase): boolean {
  return SKIPPABLE_PHASES.includes(phase);
}

export function isDiscoveryComplete(spec: ProjectSpec): boolean {
  const project = spec.project;
  const defaultUser = INITIAL_PROJECT.targetUsers[0];

  return (
    project.name !== INITIAL_PROJECT.name &&
    project.description !== INITIAL_PROJECT.description &&
    project.problem !== INITIAL_PROJECT.problem &&
    project.type !== INITIAL_PROJECT.type &&
    project.targetUsers.length > 0 &&
    !(
      project.targetUsers.length === 1 &&
      project.targetUsers[0] === defaultUser
    )
  );
}

export function hasStack(spec: ProjectSpec): boolean {
  const stack = spec.stack;
  if (!stack) {
    return false;
  }

  return Boolean(
    stack.frontend ||
      stack.backend ||
      stack.database ||
      stack.authentication ||
      stack.hosting ||
      (stack.additional && stack.additional.length > 0),
  );
}

export function hasArchitecture(spec: ProjectSpec): boolean {
  const architecture = spec.architecture;
  if (!architecture) {
    return false;
  }

  return Boolean(
    architecture.style ||
      (architecture.components && architecture.components.length > 0) ||
      (architecture.externalServices &&
        architecture.externalServices.length > 0) ||
      (architecture.constraints && architecture.constraints.length > 0),
  );
}

export function hasDatabase(spec: ProjectSpec): boolean {
  const database = spec.database;
  if (!database) {
    return false;
  }

  return Boolean(
    (database.entities && database.entities.length > 0) ||
      (database.relationships && database.relationships.length > 0) ||
      (database.constraints && database.constraints.length > 0),
  );
}

export function hasSecurity(spec: ProjectSpec): boolean {
  const security = spec.security;
  if (!security) {
    return false;
  }

  return Boolean(
    (security.authentication && security.authentication.length > 0) ||
      (security.authorization && security.authorization.length > 0) ||
      (security.sensitiveData && security.sensitiveData.length > 0) ||
      (security.constraints && security.constraints.length > 0),
  );
}

export interface PhaseContext {
  readonly skipped: boolean;
  readonly confirmed: boolean;
  readonly patch?: ProjectSpecPatch;
}

export function isPhaseSatisfied(
  phase: InterviewPhase,
  spec: ProjectSpec,
  context: PhaseContext,
): boolean {
  switch (phase) {
    case "discovery":
      return isDiscoveryComplete(spec);
    case "goals":
      return Boolean(spec.goals && spec.goals.primary.length > 0);
    case "features":
      return Boolean(spec.features && spec.features.length > 0);
    case "users":
      return Boolean(spec.users && spec.users.length > 0);
    case "stack":
      return context.skipped || hasStack(spec);
    case "architecture":
      return context.skipped || hasArchitecture(spec);
    case "database":
      return context.skipped || hasDatabase(spec);
    case "api":
      return context.skipped || Boolean(spec.api && spec.api.endpoints.length > 0);
    case "security":
      return context.skipped || hasSecurity(spec);
    case "ai_rules":
      return context.skipped || context.patch?.aiRules !== undefined;
    case "review":
      return context.confirmed;
    case "complete":
      return true;
  }
}

export function isUserConfirmation(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return (
    /^(yes|y|ok|okay|oke|iya|ya|boleh|sip|lanjut|lanjutkan|confirm|confirmed|approve|approved|done|looks good)$/i.test(
      normalized,
    ) ||
    normalized.includes("i confirm") ||
    normalized.includes("sudah benar")
  );
}

export function missingInformation(
  phase: InterviewPhase,
  spec: ProjectSpec,
): string[] {
  switch (phase) {
    case "discovery":
      return [
        !isDiscoveryComplete(spec) ? "project identity (name, description, problem, users, type)" : "",
      ].filter(Boolean);
    case "goals":
      return spec.goals?.primary.length ? [] : ["primary goals"];
    case "features":
      return spec.features?.length ? [] : ["at least one feature"];
    case "users":
      return spec.users?.length ? [] : ["at least one user type"];
    case "stack":
      return hasStack(spec)
        ? []
        : ["stack details, or a beginner recommendation if they do not know"];
    case "architecture":
      return hasArchitecture(spec)
        ? []
        : ["architecture details, or a simple recommended shape if they do not know"];
    case "database":
      return hasDatabase(spec)
        ? []
        : ["database needs, or a recommended starting schema if they do not know"];
    case "api":
      return spec.api?.endpoints.length
        ? []
        : ["API endpoints, or a small recommended API if they do not know"];
    case "security":
      return hasSecurity(spec)
        ? []
        : ["security needs, or a simple recommended default if they do not know"];
    case "ai_rules":
      return spec.aiRules
        ? []
        : ["AI rules, or a few starter rules if they do not know"];
    case "review":
      return ["explicit user confirmation"];
    case "complete":
      return [];
  }
}
