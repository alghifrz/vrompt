import { INITIAL_PROJECT } from "../../core/interview/phases";
import {
  INTERVIEW_PHASES,
  type InterviewMessage,
  type InterviewPhase,
  type InterviewQuestion,
  type InterviewSession,
} from "../../core/interview/types";

export const PHASE_LABELS: Record<InterviewPhase, string> = {
  discovery: "Discovery",
  goals: "Goals",
  features: "Features",
  users: "Users",
  stack: "Stack",
  architecture: "Architecture",
  database: "Database",
  api: "API",
  security: "Security",
  ai_rules: "AI Rules",
  review: "Review",
  complete: "Complete",
};

export type PhaseProgressState = "complete" | "current" | "skipped" | "upcoming";

export interface PhaseProgressItem {
  readonly id: InterviewPhase;
  readonly label: string;
  readonly state: PhaseProgressState;
}

export interface InterviewViewMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface InterviewViewQuestion {
  readonly id: string;
  readonly phase: InterviewPhase;
  readonly text: string;
}

export interface InterviewViewError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface InterviewViewModel {
  readonly sessionId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly phase: InterviewPhase;
  readonly messages: readonly InterviewViewMessage[];
  readonly currentQuestion?: InterviewViewQuestion;
  readonly completed: boolean;
  readonly skippedPhases: readonly InterviewPhase[];
  readonly progress: {
    readonly current: number;
    readonly total: number;
    readonly phases: readonly PhaseProgressItem[];
  };
  readonly error?: InterviewViewError;
}

const TRACKED_PHASES = INTERVIEW_PHASES.filter(
  (phase) => phase !== "complete",
);

export function displayProjectName(name: string): string {
  return name === INITIAL_PROJECT.name ? "New project" : name;
}

export function visibleMessages(
  messages: readonly InterviewMessage[],
): InterviewViewMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") {
      return [];
    }

    return [{ role: message.role, content: message.content }];
  });
}

export function questionAlreadyShown(
  messages: readonly InterviewViewMessage[],
  question?: InterviewQuestion,
): boolean {
  if (!question) {
    return false;
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  return lastAssistant?.content === question.text;
}

export function buildProgress(
  phase: InterviewPhase,
  skippedPhases: readonly InterviewPhase[],
): InterviewViewModel["progress"] {
  const active = phase === "complete" ? "review" : phase;
  const currentIndex = TRACKED_PHASES.indexOf(active);

  const phases = TRACKED_PHASES.map((id, index) => {
    let state: PhaseProgressState = "upcoming";
    if (phase === "complete" || index < currentIndex) {
      state = skippedPhases.includes(id) ? "skipped" : "complete";
    } else if (index === currentIndex) {
      state = skippedPhases.includes(id) ? "skipped" : "current";
    }

    return {
      id,
      label: PHASE_LABELS[id],
      state,
    };
  });

  return {
    current: phase === "complete" ? TRACKED_PHASES.length : Math.max(currentIndex + 1, 1),
    total: TRACKED_PHASES.length,
    phases,
  };
}

export function toInterviewViewModel(input: {
  projectId: string;
  projectName: string;
  session: InterviewSession;
  error?: InterviewViewError;
}): InterviewViewModel {
  const messages = visibleMessages(input.session.messages);
  const currentQuestion =
    !input.session.completed &&
    input.session.currentQuestion &&
    !questionAlreadyShown(messages, input.session.currentQuestion)
      ? {
          id: input.session.currentQuestion.id,
          phase: input.session.currentQuestion.phase,
          text: input.session.currentQuestion.text,
        }
      : undefined;

  return {
    sessionId: input.session.id,
    projectId: input.projectId,
    projectName: displayProjectName(input.projectName),
    phase: input.session.phase,
    messages,
    currentQuestion,
    completed: input.session.completed,
    skippedPhases: input.session.skippedPhases,
    progress: buildProgress(input.session.phase, input.session.skippedPhases),
    error: input.error,
  };
}

export function canSubmitAnswer(
  answer: string,
  state: { submitting: boolean; completed: boolean },
): boolean {
  return !state.submitting && !state.completed && answer.trim().length > 0;
}
