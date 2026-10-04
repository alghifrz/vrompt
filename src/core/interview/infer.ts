import type { ProjectSpec } from "../schema/project-spec";
import {
  buildDomainModel,
  isWeakDatabase,
  recommendedAiRules,
  recommendedDatabase,
  recommendedFeatures,
  shouldExpandFeatures,
} from "../spec/domain";
import { interpretStackAnswer } from "../spec/stack";
import {
  detectAnswerLanguage,
  interpretDiscovery,
  interpretGoal,
  interpretUser,
} from "./interpret";
import {
  INITIAL_PROJECT,
  hasArchitecture,
  hasDatabase,
  hasSecurity,
  hasStack,
} from "./phases";
import type { InterviewPhase, ProjectSpecPatch } from "./types";

export const PHASE_OPENERS: Record<InterviewPhase, string> = {
  discovery: "What are you building?",
  goals: "What's the main outcome you want first?",
  features: "What must this product do first?",
  users: "Who is this mainly for?",
  stack: "Do you already have a tech stack in mind, or should I recommend a simple one?",
  architecture: "Any architecture preference, or should I suggest a simple starting shape?",
  database: "Do you know what data to store, or should I suggest a starting model?",
  api: "Do you need a public API, or should I suggest a small one to start?",
  security: "Any login or privacy needs, or should I recommend a simple default?",
  ai_rules: "Any rules the coding agent must follow, or should I suggest a few starter rules?",
  review: "Please confirm this project specification.",
  complete: "",
};

const PRODUCT_PHASES: readonly InterviewPhase[] = [
  "discovery",
  "goals",
  "features",
  "users",
];

export function isProductPhase(phase: InterviewPhase): boolean {
  return PRODUCT_PHASES.includes(phase);
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The user is saying this section does not apply. */
export function isExplicitSkipAnswer(value: string): boolean {
  const normalized = normalizeAnswer(value);
  return (
    /^(tidak perlu|ga usah|gak usah|nggak usah|not needed|no need|doesn't apply|does not apply|not applicable)$/.test(
      normalized,
    ) || /tidak perlu|no need for|don't need|do not need/.test(normalized)
  );
}

/** The user does not know yet and wants help. */
export function isUnsureAnswer(value: string): boolean {
  const normalized = normalizeAnswer(value);
  if (!normalized) {
    return false;
  }

  return (
    /^(skip|none|n\/a|na|idk|dunno|nope|pass|bebas|terserah)(\b|$)/.test(
      normalized,
    ) ||
    /^(ga|gak|nggak|enggak|tidak|belum)\s*(tau|tahu|ada)?$/.test(normalized) ||
    /tidak tahu|belum tahu|ga tau|gak tau|gatau|not sure|don't know|do not know|kamu aja|terserah/.test(
      normalized,
    )
  );
}

/** The user is accepting the interviewer's recommendation or asking to move on. */
export function isAcceptanceAnswer(value: string): boolean {
  const normalized = normalizeAnswer(value);
  if (!normalized || normalized.length > 80) {
    return false;
  }

  return (
    /^(ok|okay|oke|okey|ya|iya|iiya|ia|yup|yes|y|boleh|sip|gas|lanjut|lanjutkan|setuju|deal|fine|sure)\b/.test(
      normalized,
    ) ||
    /setuju|boleh|lanjut|rekomendasi|pakai yang|pake yang|hosted auth|yang anda|yang kamu/.test(
      normalized,
    )
  );
}

export function recommendationNote(phase: InterviewPhase): string {
  switch (phase) {
    case "stack":
      return "I'll use Next.js, Postgres, and Clerk — one app, faster first version.";
    case "architecture":
      return "I'll start with a modular monolith — one deployable app is easier at first.";
    case "database":
      return "I'll start with a small Postgres schema — structured and easy to grow.";
    case "api":
      return "I'll start with a small authenticated HTTP API — the web app can reuse it later.";
    case "security":
      return "I'll use hosted auth and keep secrets on the server — less risk for a first version.";
    case "ai_rules":
      return "I'll add a starter rule to keep the first version small.";
    default:
      return "";
  }
}


function clip(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, max) || trimmed;
}

export function inferPhasePatch(
  phase: InterviewPhase,
  answer: string,
  spec: ProjectSpec,
): ProjectSpecPatch | undefined {
  const text = answer.trim();
  if (!text) {
    return undefined;
  }

  switch (phase) {
    case "discovery": {
      const interpreted = interpretDiscovery(text);
      const project: NonNullable<ProjectSpecPatch["project"]> = {};
      if (spec.project.name === INITIAL_PROJECT.name) {
        project.name = interpreted.name;
      }
      if (spec.project.description === INITIAL_PROJECT.description) {
        project.description = interpreted.description;
      }
      if (spec.project.problem === INITIAL_PROJECT.problem) {
        project.problem = interpreted.problem;
      }
      if (spec.project.type === INITIAL_PROJECT.type) {
        project.type = interpreted.type;
      }
      if (
        spec.project.targetUsers.length === 1 &&
        spec.project.targetUsers[0] === INITIAL_PROJECT.targetUsers[0]
      ) {
        project.targetUsers = interpreted.targetUsers;
      }
      return Object.keys(project).length > 0 ? { project } : undefined;
    }
    case "goals":
      if (spec.goals?.primary.length) {
        return undefined;
      }
      return {
        goals: {
          primary: [
            {
              id: "goal-1",
              statement: interpretGoal(text, detectAnswerLanguage(text)),
            },
          ],
          successCriteria: [],
        },
      };
    case "features":
      if (spec.features && spec.features.length > 0 && !shouldExpandFeatures(spec, text)) {
        return undefined;
      }
      return { features: recommendedFeatures(spec, text) };
    case "users": {
      if (spec.users?.length) {
        return undefined;
      }
      const user = interpretUser(text, detectAnswerLanguage(text));
      return {
        users: [
          {
            id: "user-1",
            name: user.name,
            description: user.description,
            goals: user.goals,
            permissions: ["use-app"],
          },
        ],
      };
    }
    case "stack": {
      const stack = interpretStackAnswer(text, spec.stack);
      if (stack.frontend || stack.backend || stack.database || stack.authentication || stack.hosting) {
        return { stack };
      }
      if (hasStack(spec)) {
        return undefined;
      }
      return { stack };
    }
    case "architecture":
      if (hasArchitecture(spec)) {
        return undefined;
      }
      return { architecture: { constraints: [clip(text, 160)] } };
    case "database":
      if (hasDatabase(spec) && !isWeakDatabase(spec)) {
        return undefined;
      }
      return { database: recommendedDatabase(spec) };
    case "security":
      if (hasSecurity(spec)) {
        return undefined;
      }
      return { security: { constraints: [clip(text, 160)] } };
    case "api":
    case "ai_rules":
    case "review":
    case "complete":
      return undefined;
  }
}

/** Beginner-friendly defaults when the user does not know a technical section yet. */
export function recommendPhasePatch(
  phase: InterviewPhase,
  spec: ProjectSpec,
): ProjectSpecPatch | undefined {
  switch (phase) {
    case "stack":
      if (hasStack(spec)) {
        return undefined;
      }
      return {
        stack: {
          frontend: "Next.js",
          backend: "Next.js",
          database: "Postgres",
          authentication: "Clerk",
          hosting: "Vercel",
          additional: ["TypeScript"],
        },
      };
    case "architecture":
      if (hasArchitecture(spec)) {
        return undefined;
      }
      return {
        architecture: {
          style: "modular monolith",
          constraints: [
            `Keep ${spec.project.name} as one app until a second surface is real.`,
          ],
        },
      };
    case "database":
      if (hasDatabase(spec) && !isWeakDatabase(spec)) {
        return undefined;
      }
      return {
        database: recommendedDatabase(spec),
      };
    case "api":
      if (spec.api?.endpoints.length) {
        return undefined;
      }
      return {
        api: {
          endpoints: buildDomainModel(spec).endpoints.map((endpoint) => ({
            method: endpoint.method,
            path: endpoint.path,
            purpose: endpoint.purpose,
            authRequired: endpoint.authRequired,
          })),
        },
      };
    case "security":
      if (hasSecurity(spec)) {
        return undefined;
      }
      return {
        security: {
          authentication: ["Hosted auth with email or social sign-in"],
          constraints: [
            "Keep secrets on the server. Do not expose API keys in the client.",
          ],
        },
      };
    case "ai_rules":
      if (spec.aiRules && spec.aiRules.length > 1) {
        return undefined;
      }
      return {
        aiRules: recommendedAiRules(spec),
      };
    default:
      return undefined;
  }
}

