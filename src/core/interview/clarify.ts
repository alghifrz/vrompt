import { extractJobs } from "../spec/jobs";
import { isAbstractNoun, isRoleWord, isSeasonWord, isVenueWord, isWorkNoun } from "../spec/lexicon";
import { detectAnswerLanguage } from "./interpret";
import { PHASE_OPENERS, isAcceptanceAnswer, isExplicitSkipAnswer, isUnsureAnswer } from "./infer";
import {
  hasDatabase,
  isDiscoveryComplete,
  isUserConfirmation,
} from "./phases";
import { isWeakDatabase } from "../spec/domain";
import type { InterviewPhase, InterviewSession } from "./types";
import type { ProjectSpec } from "../schema/project-spec";

export const CLARIFIABLE_PHASES: readonly InterviewPhase[] = [
  "discovery",
  "goals",
  "features",
  "users",
  "database",
];

export const MAX_CLARIFY_ANSWERS = 2;

export function isClarifiablePhase(phase: InterviewPhase): boolean {
  return CLARIFIABLE_PHASES.includes(phase);
}

export function userTurnsInPhase(
  session: InterviewSession,
  phase: InterviewPhase,
): number {
  const opener = PHASE_OPENERS[phase];
  let start = -1;
  for (const [index, message] of session.messages.entries()) {
    if (message.role !== "assistant") {
      continue;
    }
    if (sharesTopic(message.content, opener)) {
      start = index;
    }
  }
  const from = start >= 0 ? start : 0;
  return session.messages.slice(from).filter((message) => message.role === "user").length;
}

export function shouldClarifyPhase(input: {
  readonly phase: InterviewPhase;
  readonly answer: string;
  readonly spec: ProjectSpec;
  readonly session: InterviewSession;
  readonly modelClarify?: boolean;
}): boolean {
  if (!isClarifiablePhase(input.phase)) {
    return false;
  }
  if (isExplicitSkipAnswer(input.answer) || isUnsureAnswer(input.answer)) {
    return false;
  }
  if (isAcceptanceAnswer(input.answer) || isUserConfirmation(input.answer)) {
    return false;
  }
  if (userTurnsInPhase(input.session, input.phase) > MAX_CLARIFY_ANSWERS) {
    return false;
  }
  if (input.modelClarify === true) {
    return true;
  }
  return (
    needsClarification(input.phase, input.answer, input.spec) &&
    !hasPhaseSubstance(input.phase, input.spec)
  );
}

function hasPhaseSubstance(phase: InterviewPhase, spec: ProjectSpec): boolean {
  switch (phase) {
    case "discovery":
      return isDiscoveryComplete(spec);
    case "goals":
      return Boolean(spec.goals?.primary.length);
    case "features":
      return Boolean(spec.features?.length);
    case "users":
      return Boolean(spec.users?.length);
    case "database":
      return hasDatabase(spec) && !isWeakDatabase(spec);
    default:
      return true;
  }
}

export function needsClarification(
  phase: InterviewPhase,
  answer: string,
  spec: ProjectSpec,
): boolean {
  const text = answer.trim();
  if (!text || !isClarifiablePhase(phase)) {
    return false;
  }

  switch (phase) {
    case "discovery":
      return !hasDiscoverableJob(text, spec);
    case "goals":
      return !hasGoalOutcome(text, spec);
    case "features":
      return !hasFeatureJobs(text, spec);
    case "users":
      return !hasConcreteUser(text);
    case "database":
      return hasDatabaseConfusion(text) && concreteJobs(text, spec).length === 0;
    default:
      return false;
  }
}

export function clarifyingQuestion(
  phase: InterviewPhase,
  answer: string,
  spec: ProjectSpec,
): string {
  const language = detectAnswerLanguage(`${answer} ${spec.project.description}`);
  const hint = domainHint(answer, spec);

  if (language === "id") {
    switch (phase) {
      case "discovery":
        return hint
          ? `Di ${hint} itu, pekerjaan pertama yang harus selesai di aplikasi apa — jangan yang nice-to-have?`
          : "Pekerjaan pertama yang harus bisa diselesaikan user di aplikasi ini apa?";
      case "goals":
        return "Kalau versi pertama sukses, apa yang berubah buat penggunanya dalam satu kalimat?";
      case "features":
        return "2-3 pekerjaan wajib di versi pertama apa? Misalnya catat X, lihat X, atau ingatkan Y.";
      case "users":
        return "Siapa yang pakai ini hampir setiap hari, dan pekerjaan mereka apa?";
      case "database":
        return "Supaya pekerjaan itu jalan, data apa yang harus tersimpan — orang, barang, atau kejadian?";
      default:
        return PHASE_OPENERS[phase];
    }
  }

  switch (phase) {
    case "discovery":
      return hint
        ? `In that ${hint}, what is the first job the app must finish — not a nice-to-have?`
        : "What is the first job a user must finish in this app?";
    case "goals":
      return "If the first version works, what changes for the user in one sentence?";
    case "features":
      return "What 2-3 jobs must exist in v1? For example record X, view X, or remind Y.";
    case "users":
      return "Who uses this almost every day, and what is their job?";
    case "database":
      return "What must be stored so those jobs work — people, things, or events?";
    default:
      return PHASE_OPENERS[phase];
  }
}

export function productAnswerCorpus(
  session: InterviewSession,
  latestAnswer: string,
): string {
  return [
    ...session.messages.filter((message) => message.role === "user").map((message) => message.content),
    latestAnswer,
  ]
    .filter(
      (item) =>
        item.trim().length > 0 &&
        !isAcceptanceAnswer(item) &&
        !isUnsureAnswer(item) &&
        !isExplicitSkipAnswer(item),
    )
    .join("\n");
}

const GENERIC_JOB_OBJECTS =
  /^(app|aplikasi|application|sistem|system|produk|product|web|software|website|platform|tool|tools|idea|ide)$/i;

function concreteJobs(answer: string, spec: ProjectSpec) {
  return extractJobs(spec, answer).filter(
    (job) =>
      !GENERIC_JOB_OBJECTS.test(job.object) &&
      !isAbstractNoun(job.object) &&
      !isSeasonWord(job.object),
  );
}

function hasDiscoverableJob(answer: string, spec: ProjectSpec): boolean {
  if (concreteJobs(answer, spec).length > 0) {
    return true;
  }
  if (/\b(namanya|called|named)\b/i.test(answer) && /[A-Za-z][A-Za-z0-9-]{2,}/.test(answer)) {
    return true;
  }
  const tokens = words(answer);
  const hasRole = tokens.some((word) => isRoleWord(word));
  const hasWork = tokens.some((word) => isWorkNoun(word));
  const hasVenue = tokens.some((word) => isVenueWord(word));
  if ((hasRole || hasVenue) && hasWork) {
    return true;
  }
  if ((hasRole || hasVenue) && tokens.length >= 8) {
    return true;
  }
  return false;
}

function hasGoalOutcome(answer: string, spec: ProjectSpec): boolean {
  if (concreteJobs(answer, spec).length > 0) {
    return true;
  }
  const tokens = words(answer);
  return tokens.some((word) => isWorkNoun(word) || isVenueWord(word)) && tokens.length >= 4;
}

function hasFeatureJobs(answer: string, spec: ProjectSpec): boolean {
  return (
    concreteJobs(answer, spec).length > 0 ||
    words(answer).some((word) => isWorkNoun(word) && !GENERIC_JOB_OBJECTS.test(word))
  );
}

function hasConcreteUser(answer: string): boolean {
  const tokens = words(answer);
  const roles = tokens.filter((word) => isRoleWord(word) && word !== "orang" && word !== "user");
  return roles.length > 0 || (tokens.length >= 3 && tokens.some((word) => isVenueWord(word) || isWorkNoun(word)));
}

function hasDatabaseConfusion(answer: string): boolean {
  return /data|tabel|table|simpan|store/i.test(answer) && words(answer).length < 6;
}

function domainHint(answer: string, spec: ProjectSpec): string | undefined {
  const tokens = words(`${answer} ${spec.project.description} ${spec.project.name}`);
  const venue = tokens.find((word) => isVenueWord(word));
  if (venue) {
    return venue;
  }
  const work = tokens.find((word) => isWorkNoun(word));
  return work;
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function sharesTopic(left: string, right: string): boolean {
  const needles = right
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);
  if (needles.length === 0) {
    return left.toLowerCase().includes(right.toLowerCase());
  }
  const haystack = left.toLowerCase();
  return needles.filter((word) => haystack.includes(word)).length >= Math.min(3, needles.length);
}
