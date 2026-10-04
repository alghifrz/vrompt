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
import { looksLikeChattyLabel, looksLikeJunkLabel } from "../spec/lexicon";
import { recommendedAiRules } from "../spec/domain";
import {
  detectAnswerLanguage,
  interpretDescription,
  interpretDiscovery,
  interpretGoal,
  interpretProblem,
  interpretUser,
  looksLikeActorName,
  looksLikeRawChat,
  looksLikeSpokenName,
} from "./interpret";
import { commitProjectSpecPatch } from "./merge";
import { INITIAL_PROJECT } from "./phases";
import type { ProjectSpecPatch } from "./types";

export const SPEC_REWRITE_PURPOSE = "spec-rewrite";

const CASUAL_SPEECH =
  /\b(gw|gue|gua|wkwk|banget|gitu|kek|kayak|sih|deh|dong)\b/i;

const FILLERS =
  /\b(gw|gue|gua|aku|banget|gitu|kek|kayak|sih|deh|dong|wkwk|namanya|punya|jadi)\b/gi;

export function looksLikeCasualSpeech(text: string): boolean {
  return looksLikeRawChat(text) || CASUAL_SPEECH.test(text);
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
    looksLikeSpokenName(name) ||
    looksLikeCasualSpeech(name) ||
    looksLikeCasualSpeech(description) ||
    looksLikeCasualSpeech(problem)
  ) {
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

  if (looksLikeActorName(name)) {
    return true;
  }
  if (spec.users?.some((user) => user.name === name) || targetUsers.includes(name)) {
    return true;
  }
  if (spec.goals?.primary.some((goal) => /manual lagi|aja kali|gitu\b/i.test(goal.statement))) {
    return true;
  }
  if (spec.features?.some((feature) => looksLikeChattyLabel(feature.name) || looksLikeJunkLabel(feature.name))) {
    return true;
  }
  if ((spec.aiRules?.length ?? 0) <= 1 && (spec.features?.length ?? 0) >= 1) {
    return true;
  }
  if (
    spec.database?.entities?.some((entity) => /^(catat|kelola|lihat|lewat)$/i.test(entity.name))
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
    "You are a senior software engineer rewriting a ProjectSpec from a messy interview.",
    "Interpret the user's intent. Do not echo chat, slang, fillers, first-person dumps, or run-on spoken answers.",
    "Never copy slang. Write the spec an expert would write after understanding the idea.",
    "Do not invent a different product. You MAY infer implied first-version features and tables from objects they already mentioned.",
    "Give the product a short name (1-4 words), not a sentence.",
    "Description says what the app is. Problem says the current pain. Those must differ.",
    "Write goals, features, and users as complete, readable spec sentences.",
    "If features are one chat sentence, expand them into the v1 jobs implied by the idea.",
    "If tables are a persona or a feature title, replace them with people, objects, and events from the conversation.",
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
    "Interpret these fields into expert spec language. Do not paste the chat wording.",
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

function polishProject(project: ProjectSpec["project"]): ProjectSpec["project"] {
  const uniqueFields = [...new Set([project.name, project.description, project.problem])];
  const dump = uniqueFields.join(". ");
  const nameLooksRaw =
    looksLikeSpokenName(project.name) ||
    looksLikeCasualSpeech(project.name) ||
    looksLikeActorName(project.name) ||
    project.name === project.description;
  const descriptionLooksRaw =
    looksLikeCasualSpeech(project.description) || project.description === project.problem;
  const problemLooksRaw =
    looksLikeCasualSpeech(project.problem) || project.problem === project.description;

  if (nameLooksRaw || descriptionLooksRaw || problemLooksRaw) {
    const interpreted = interpretDiscovery(dump);
    const language = detectAnswerLanguage(dump);
    return {
      ...project,
      name: nameLooksRaw ? interpreted.name : project.name,
      description: descriptionLooksRaw
        ? interpretDescription(project.description, interpreted.name, language)
        : project.description,
      problem: problemLooksRaw
        ? interpretProblem(project.problem, interpreted.description, language)
        : project.problem,
      targetUsers: project.targetUsers.map((user) =>
        looksLikeCasualSpeech(user) ? interpretUser(user, detectAnswerLanguage(user)).name : user,
      ),
    };
  }

  return {
    ...project,
    targetUsers: project.targetUsers.map((user) =>
      looksLikeCasualSpeech(user) ? interpretUser(user, detectAnswerLanguage(user)).name : user,
    ),
  };
}

/** Deterministic cleanup when the model is unavailable or still copies slang. */
export function polishSpecLocally(spec: ProjectSpec): ProjectSpec {
  const stack = spec.stack ? rescueStack(spec.stack) : spec.stack;
  if (!needsSpecRewrite(spec) && !looksLikeStackDump(spec.stack)) {
    return stack === spec.stack ? spec : { ...spec, stack };
  }

  const interpreted: ProjectSpec = {
    ...spec,
    stack,
    project: polishProject(spec.project),
    goals: spec.goals
      ? {
          ...spec.goals,
          primary: spec.goals.primary.map((goal) => ({
            ...goal,
            statement:
              looksLikeCasualSpeech(goal.statement) || /manual lagi|aja kali/i.test(goal.statement)
                ? interpretGoal(goal.statement, detectAnswerLanguage(goal.statement))
                : goal.statement,
          })),
          successCriteria: spec.goals.successCriteria.map((item) =>
            looksLikeCasualSpeech(item)
              ? interpretGoal(item, detectAnswerLanguage(item))
              : item,
          ),
        }
      : spec.goals,
    users: spec.users?.map((user) => {
      if (
        !looksLikeCasualSpeech(user.name) &&
        !looksLikeCasualSpeech(user.description) &&
        user.name !== user.description
      ) {
        return user;
      }
      const next = interpretUser(
        `${user.name}. ${user.description}`,
        detectAnswerLanguage(`${user.name} ${user.description}`),
      );
      return {
        ...user,
        name: next.name,
        description: next.description,
        goals: user.goals.map((goal) =>
          looksLikeCasualSpeech(goal)
            ? interpretGoal(goal, detectAnswerLanguage(goal))
            : goal,
        ),
      };
    }),
  };

  const features = shouldExpandFeatures(interpreted)
    ? recommendedFeatures(interpreted)
    : interpreted.features;
  const database = isWeakDatabase(interpreted)
    ? recommendedDatabase(interpreted)
    : interpreted.database;

  return {
    ...interpreted,
    ...(features ? { features } : {}),
    ...(database ? { database } : {}),
    features: features
      ?.filter((feature) => !looksLikeJunkLabel(feature.name))
      .map((feature) => ({
        ...feature,
        name: looksLikeChattyLabel(feature.name)
          ? titleCaseWords(feature.name.split(/\s+/)[0] ?? feature.name, 2)
          : looksLikeCasualSpeech(feature.name) || feature.name === feature.description
            ? titleCaseWords(feature.name, 4)
            : feature.name,
        description: looksLikeCasualSpeech(feature.description)
          ? asSentence(feature.description)
          : feature.description,
      })),
    aiRules:
      (interpreted.aiRules?.length ?? 0) <= 1 ? recommendedAiRules(interpreted) : interpreted.aiRules,
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
