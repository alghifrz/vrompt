import type { LLMProvider } from "../llm/types";
import type { ProjectSpec } from "../schema/project-spec";
import {
  isWeakDatabase,
  recommendedDatabase,
  recommendedFeatures,
  shouldExpandFeatures,
} from "../spec/domain";
import { looksLikeStackDump, rescueStack } from "../spec/stack";
import { parseInterviewResponse } from "./extraction";
import { commitProjectSpecPatch } from "./merge";
import { INITIAL_PROJECT } from "./phases";
import type { ProjectSpecPatch } from "./types";

export const SPEC_REWRITE_PURPOSE = "spec-rewrite";

const CASUAL_SPEECH =
  /\b(gw|gue|gua|wkwk|banget|gitu|kek|kayak|sih|deh|dong)\b/i;

const FILLERS =
  /\b(gw|gue|gua|aku|banget|gitu|kek|kayak|sih|deh|dong|wkwk|namanya|punya|jadi)\b/gi;

export function looksLikeCasualSpeech(text: string): boolean {
  return CASUAL_SPEECH.test(text);
}

function isPlaceholderProject(spec: ProjectSpec): boolean {
  return (
    spec.project.name === INITIAL_PROJECT.name &&
    spec.project.description === INITIAL_PROJECT.description
  );
}

export function needsSpecRewrite(spec: ProjectSpec): boolean {
  if (isPlaceholderProject(spec)) {
    return false;
  }

  const { name, description, problem, targetUsers } = spec.project;
  if (name === description || description === problem) {
    return true;
  }
  if (
    looksLikeCasualSpeech(name) ||
    looksLikeCasualSpeech(description) ||
    looksLikeCasualSpeech(problem)
  ) {
    return true;
  }
  if (name.length > 42 && /[,;]/.test(name)) {
    return true;
  }
  if (targetUsers.some((user) => looksLikeCasualSpeech(user))) {
    return true;
  }
  if (spec.goals?.primary.some((goal) => looksLikeCasualSpeech(goal.statement))) {
    return true;
  }
  if (
    spec.features?.some(
      (feature) =>
        looksLikeCasualSpeech(feature.name) ||
        looksLikeCasualSpeech(feature.description) ||
        feature.name === feature.description,
    )
  ) {
    return true;
  }
  if (
    spec.users?.some(
      (user) =>
        looksLikeCasualSpeech(user.name) ||
        looksLikeCasualSpeech(user.description) ||
        user.name === user.description ||
        user.goals.some((goal) => looksLikeCasualSpeech(goal)),
    )
  ) {
    return true;
  }

  if (looksLikeStackDump(spec.stack)) {
    return true;
  }

  if (shouldExpandFeatures(spec) || isWeakDatabase(spec)) {
    return true;
  }

  return false;
}

export function buildSpecRewriteSystemPrompt(): string {
  return [
    "You rewrite a ProjectSpec into clear product language.",
    "Keep the same meaning. Do not invent features, users, or facts.",
    "Never copy slang, fillers, chat typos, or run-on spoken answers.",
    "Give the product a short name (1-4 words), not a sentence.",
    "Write description, problem, goals, features, and users as complete, readable sentences.",
    "Keep the same language as the draft (Indonesian stays Indonesian).",
    "Preserve ids, priority, status, type, and technical sections you are not rewriting.",
    "If stack.additional is a spoken sentence about frontend or backend, map the tools into frontend/backend/database/authentication/hosting. Never leave slang in additional.",
    "Respond only in this format:",
    "",
    "<structured>",
    "{",
    '  "patch": { "project": {}, "goals": {}, "features": [], "users": [] }',
    "}",
    "</structured>",
  ].join("\n");
}

export function buildSpecRewriteUserPrompt(spec: ProjectSpec): string {
  return [
    "Rewrite the user-facing fields below so they read like a product spec, not a chat message.",
    "Only include sections that already exist.",
    "",
    "<spec>",
    JSON.stringify(spec, null, 2),
    "</spec>",
  ].join("\n");
}

const NAME_NOISE = /^(kacau|berantakan|jelek|buruk|ribet|susah|banget)$/i;

function stripFillers(text: string): string {
  return text
    .replace(FILLERS, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, max) || trimmed;
}

function titleCaseWords(text: string, maxWords = 3): string {
  const words = stripFillers(text)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !NAME_NOISE.test(word));
  const picked = words.slice(0, maxWords);
  if (picked.length === 0) {
    return clip(text.replace(/[,.!?].*$/, ""), 32);
  }

  return picked
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function asSentence(text: string): string {
  let next = stripFillers(text).replace(/\s+/g, " ").trim();
  if (!next) {
    next = text.trim().replace(/\s+/g, " ");
  }
  next = next.charAt(0).toUpperCase() + next.slice(1);
  if (!/[.!?]$/.test(next)) {
    next += ".";
  }
  return next;
}

function asProblem(text: string, description: string): string {
  const sentence = asSentence(text);
  if (sentence !== description) {
    return sentence;
  }

  const body = sentence.replace(/[.!?]$/, "");
  const lowered = body.charAt(0).toLowerCase() + body.slice(1);
  const indonesian = /\b(yang|untuk|dari|dan|warung|pencatatan|pengguna)\b/i.test(
    body,
  );
  return indonesian
    ? `Kondisi saat ini: ${lowered}.`
    : `The current situation: ${lowered}.`;
}

function polishProject(project: ProjectSpec["project"]): ProjectSpec["project"] {
  const nameLooksRaw =
    looksLikeCasualSpeech(project.name) ||
    project.name === project.description ||
    (project.name.length > 42 && /[,;]/.test(project.name));
  const description = looksLikeCasualSpeech(project.description)
    ? asSentence(project.description)
    : project.description;
  const problemSource =
    looksLikeCasualSpeech(project.problem) || project.problem === project.description
      ? asProblem(project.problem, description)
      : project.problem;

  return {
    ...project,
    name: nameLooksRaw ? titleCaseWords(project.name) : project.name,
    description:
      project.description === project.problem ? asSentence(project.description) : description,
    problem: problemSource,
    targetUsers: project.targetUsers.map((user) =>
      looksLikeCasualSpeech(user) ? titleCaseWords(user, 4) : user,
    ),
  };
}

/** Deterministic cleanup when the model is unavailable or still copies slang. */
export function polishSpecLocally(spec: ProjectSpec): ProjectSpec {
  const stack = spec.stack ? rescueStack(spec.stack) : spec.stack;
  const features = shouldExpandFeatures(spec)
    ? recommendedFeatures(spec)
    : spec.features;
  const database = isWeakDatabase(spec) ? recommendedDatabase(spec) : spec.database;
  if (
    !needsSpecRewrite(spec) &&
    !looksLikeStackDump(spec.stack) &&
    features === spec.features &&
    database === spec.database
  ) {
    return stack === spec.stack ? spec : { ...spec, stack };
  }

  return {
    ...spec,
    stack,
    ...(features ? { features } : {}),
    ...(database ? { database } : {}),
    project: polishProject(spec.project),
    goals: spec.goals
      ? {
          ...spec.goals,
          primary: spec.goals.primary.map((goal) => ({
            ...goal,
            statement: looksLikeCasualSpeech(goal.statement)
              ? asSentence(goal.statement)
              : goal.statement,
          })),
          successCriteria: spec.goals.successCriteria.map((item) =>
            looksLikeCasualSpeech(item) ? asSentence(item) : item,
          ),
        }
      : spec.goals,
    features: features?.map((feature) => ({
      ...feature,
      name:
        looksLikeCasualSpeech(feature.name) || feature.name === feature.description
          ? titleCaseWords(feature.name, 4)
          : feature.name,
      description: looksLikeCasualSpeech(feature.description)
        ? asSentence(feature.description)
        : feature.description,
    })),
    users: spec.users?.map((user) => ({
      ...user,
      name:
        looksLikeCasualSpeech(user.name) || user.name === user.description
          ? titleCaseWords(user.name, 4)
          : user.name,
      description: looksLikeCasualSpeech(user.description)
        ? asSentence(user.description)
        : user.description,
      goals: user.goals.map((goal) =>
        looksLikeCasualSpeech(goal) ? asSentence(goal) : goal,
      ),
    })),
  };
}

export function specToRewritePatch(spec: ProjectSpec): ProjectSpecPatch {
  return {
    project: spec.project,
    ...(spec.goals ? { goals: spec.goals } : {}),
    ...(spec.features ? { features: spec.features } : {}),
    ...(spec.users ? { users: spec.users } : {}),
    ...(spec.stack ? { stack: spec.stack } : {}),
  };
}

export async function rewriteProjectSpec(
  provider: LLMProvider,
  spec: ProjectSpec,
): Promise<ProjectSpec> {
  if (!needsSpecRewrite(spec)) {
    return spec;
  }

  const response = await provider.generate({
    system: buildSpecRewriteSystemPrompt(),
    messages: [{ role: "user", content: buildSpecRewriteUserPrompt(spec) }],
    temperature: 0.2,
    metadata: { purpose: SPEC_REWRITE_PURPOSE },
  });

  const parsed = parseInterviewResponse(response.content);
  if (!parsed.extraction?.patch) {
    return spec;
  }

  const committed = commitProjectSpecPatch(spec, parsed.extraction.patch);
  return committed.ok ? committed.spec : spec;
}

export async function applySpecLanguagePass(
  spec: ProjectSpec,
  provider?: LLMProvider,
): Promise<ProjectSpec> {
  let next = spec;
  if (provider && needsSpecRewrite(next)) {
    try {
      next = await rewriteProjectSpec(provider, next);
    } catch {
      // Keep the draft and fall back to local cleanup.
    }
  }

  if (needsSpecRewrite(next)) {
    next = polishSpecLocally(next);
  }

  return next;
}
