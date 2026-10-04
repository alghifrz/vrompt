import type { ProjectSpec } from "../schema/project-spec";

export const INTERVIEW_PHASES = [
  "discovery",
  "goals",
  "features",
  "users",
  "stack",
  "architecture",
  "database",
  "api",
  "security",
  "ai_rules",
  "review",
  "complete",
] as const;

export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];

export type InterviewMessageRole = "system" | "assistant" | "user";

export interface InterviewMessage {
  readonly role: InterviewMessageRole;
  readonly content: string;
}

export interface InterviewQuestion {
  readonly id: string;
  readonly phase: InterviewPhase;
  readonly text: string;
  readonly required: boolean;
}

/**
 * Session is the only interview state.
 * The spec is always a Zod-valid ProjectSpec. Early turns use explicit
 * placeholders (see createInitialProjectSpec) until discovery replaces them.
 */
export interface InterviewSession {
  readonly id: string;
  readonly phase: InterviewPhase;
  readonly spec: ProjectSpec;
  readonly messages: readonly InterviewMessage[];
  readonly currentQuestion?: InterviewQuestion;
  readonly completed: boolean;
  readonly skippedPhases: readonly InterviewPhase[];
  readonly questionSeq: number;
}

export interface ProjectSpecPatch {
  readonly project?: Partial<ProjectSpec["project"]>;
  readonly goals?: ProjectSpec["goals"];
  readonly features?: ProjectSpec["features"];
  readonly users?: ProjectSpec["users"];
  readonly stack?: ProjectSpec["stack"];
  readonly architecture?: ProjectSpec["architecture"];
  readonly database?: ProjectSpec["database"];
  readonly api?: ProjectSpec["api"];
  readonly security?: ProjectSpec["security"];
  readonly constraints?: ProjectSpec["constraints"];
  readonly aiRules?: ProjectSpec["aiRules"];
}

export interface InterviewExtraction {
  readonly patch?: ProjectSpecPatch;
  readonly skip?: boolean;
  readonly confirm?: boolean;
  readonly clarify?: boolean;
}

export interface InterviewTurnResult {
  readonly session: InterviewSession;
  readonly question?: InterviewQuestion;
  readonly completed: boolean;
  readonly extracted: boolean;
  readonly error?: import("./errors").InterviewError;
}
