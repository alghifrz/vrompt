import { LLMError } from "../llm/errors";
import type { LLMProvider } from "../llm/types";
import { ProjectSpecSchema, type ProjectSpec } from "../schema/project-spec";
import { InterviewError, InterviewErrorCode } from "./errors";
import { parseInterviewResponse } from "./extraction";
import {
  inferPhasePatch,
  isAcceptanceAnswer,
  isExplicitSkipAnswer,
  isProductPhase,
  isUnsureAnswer,
  recommendPhasePatch,
  recommendationNote,
  PHASE_OPENERS,
} from "./infer";
import {
  isWeakDatabase,
  recommendedDatabase,
  recommendedFeatures,
  shouldExpandFeatures,
} from "../spec/domain";
import { interpretStackAnswer } from "../spec/stack";
import { commitProjectSpecPatch } from "./merge";
import {
  INITIAL_PROJECT,
  isInterviewPhase,
  isPhaseSatisfied,
  isSkippable,
  isUserConfirmation,
  nextPhase,
} from "./phases";
import {
  buildInterviewSystemPrompt,
  buildInterviewUserPrompt,
} from "./prompts";
import type {
  InterviewMessage,
  InterviewPhase,
  InterviewQuestion,
  InterviewSession,
  InterviewTurnResult,
} from "./types";

const REQUIRED_QUESTION_PHASES: readonly InterviewPhase[] = [
  "discovery",
  "goals",
  "features",
  "users",
  "review",
];

export function createInitialProjectSpec(): ProjectSpec {
  return {
    project: {
      name: INITIAL_PROJECT.name,
      description: INITIAL_PROJECT.description,
      problem: INITIAL_PROJECT.problem,
      targetUsers: [...INITIAL_PROJECT.targetUsers],
      type: INITIAL_PROJECT.type,
      status: INITIAL_PROJECT.status,
    },
  };
}

export function createInterviewSession(input: { id: string }): InterviewSession {
  const id = input.id.trim();
  if (!id) {
    throw new InterviewError(
      InterviewErrorCode.INVALID_SESSION,
      "Session id is required.",
    );
  }

  return {
    id,
    phase: "discovery",
    spec: createInitialProjectSpec(),
    messages: [],
    completed: false,
    skippedPhases: [],
    questionSeq: 0,
  };
}

function cloneSession(session: InterviewSession): InterviewSession {
  return {
    id: session.id,
    phase: session.phase,
    spec: structuredClone(session.spec),
    messages: session.messages.map((message) => ({ ...message })),
    currentQuestion: session.currentQuestion
      ? { ...session.currentQuestion }
      : undefined,
    completed: session.completed,
    skippedPhases: [...session.skippedPhases],
    questionSeq: session.questionSeq,
  };
}

function validateSession(session: InterviewSession): InterviewError | undefined {
  if (!session.id.trim()) {
    return new InterviewError(
      InterviewErrorCode.INVALID_SESSION,
      "Session id is required.",
    );
  }

  if (!isInterviewPhase(session.phase)) {
    return new InterviewError(
      InterviewErrorCode.PHASE_ERROR,
      "Session phase is not a known interview phase.",
    );
  }

  const parsed = ProjectSpecSchema.safeParse(session.spec);
  if (!parsed.success) {
    return new InterviewError(
      InterviewErrorCode.INVALID_SESSION,
      "Session ProjectSpec is not valid.",
    );
  }

  if (session.completed && session.phase !== "complete") {
    return new InterviewError(
      InterviewErrorCode.COMPLETION_ERROR,
      "A completed session must be in the complete phase.",
    );
  }

  return undefined;
}

function questionFor(
  phase: InterviewPhase,
  seq: number,
  text: string,
): InterviewQuestion {
  return {
    id: `q-${phase}-${String(seq)}`,
    phase,
    text,
    required: REQUIRED_QUESTION_PHASES.includes(phase),
  };
}

function appendMessages(
  messages: readonly InterviewMessage[],
  extras: readonly InterviewMessage[],
): InterviewMessage[] {
  return [...messages, ...extras];
}

function resultFromSession(
  session: InterviewSession,
  extras: {
    extracted: boolean;
    error?: InterviewError;
  },
): InterviewTurnResult {
  return {
    session,
    question: session.currentQuestion,
    completed: session.completed,
    extracted: extras.extracted,
    error: extras.error,
  };
}

function wrapProviderError(error: unknown): InterviewError {
  if (error instanceof InterviewError) {
    return error;
  }

  if (error instanceof LLMError) {
    return new InterviewError(
      InterviewErrorCode.PROVIDER_ERROR,
      error.message,
      {
        cause: error,
        retryable: error.retryable,
      },
    );
  }

  return new InterviewError(
    InterviewErrorCode.PROVIDER_ERROR,
    "The language model provider failed.",
    { cause: error },
  );
}

function isRecoverableExtractionError(error: InterviewError): boolean {
  return (
    error.code === InterviewErrorCode.EXTRACTION_FAILED ||
    error.code === InterviewErrorCode.PATCH_INVALID ||
    error.code === InterviewErrorCode.SPEC_INVALID
  );
}

function nextQuestionText(
  previousPhase: InterviewPhase,
  next: InterviewPhase,
  modelQuestion?: string,
  notedRecommendation = false,
): string | undefined {
  if (next === "complete") {
    return undefined;
  }

  if (next !== previousPhase) {
    const opener = PHASE_OPENERS[next];
    const note = notedRecommendation ? recommendationNote(previousPhase) : "";
    return note ? `${note}\n\n${opener}` : opener;
  }

  return modelQuestion && !isSameTopic(modelQuestion, PHASE_OPENERS[next])
    ? modelQuestion
    : PHASE_OPENERS[next];
}

function isSameTopic(left: string, right: string): boolean {
  const words = right
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);
  const haystack = left.toLowerCase();
  return words.filter((word) => haystack.includes(word)).length >= 3;
}

export class InterviewEngine {
  constructor(private readonly provider: LLMProvider) {}

  async start(session: InterviewSession): Promise<InterviewTurnResult> {
    return this.executeTurn(session);
  }

  async runTurn(
    session: InterviewSession,
    userAnswer: string,
  ): Promise<InterviewTurnResult> {
    return this.executeTurn(session, userAnswer);
  }

  private async executeTurn(
    session: InterviewSession,
    userAnswer?: string,
  ): Promise<InterviewTurnResult> {
    const sessionError = validateSession(session);
    if (sessionError) {
      return resultFromSession(cloneSession(session), {
        extracted: false,
        error: sessionError,
      });
    }

    if (session.completed || session.phase === "complete") {
      return resultFromSession(cloneSession(session), {
        extracted: false,
        error: new InterviewError(
          InterviewErrorCode.COMPLETION_ERROR,
          "The interview is already complete.",
        ),
      });
    }

    if (userAnswer !== undefined && userAnswer.trim().length === 0) {
      return resultFromSession(cloneSession(session), {
        extracted: false,
        error: new InterviewError(
          InterviewErrorCode.INVALID_ANSWER,
          "The user answer cannot be empty.",
        ),
      });
    }

    const next: InterviewSession = {
      ...cloneSession(session),
      messages:
        userAnswer !== undefined
          ? appendMessages(session.messages, [
              { role: "user", content: userAnswer },
            ])
          : session.messages.map((message) => ({ ...message })),
    };

    let responseContent: string;
    try {
      const response = await this.provider.generate({
        system: buildInterviewSystemPrompt(session.phase),
        messages: [
          {
            role: "user",
            content: buildInterviewUserPrompt(session, userAnswer),
          },
        ],
        temperature: 0.3,
        metadata: {
          interviewId: session.id,
          phase: session.phase,
        },
      });
      responseContent = response.content;
    } catch (error) {
      return resultFromSession(next, {
        extracted: false,
        error: wrapProviderError(error),
      });
    }

    const parsed = parseInterviewResponse(responseContent);
    let extracted = false;
    let spec = next.spec;
    const skippedPhases = [...next.skippedPhases];
    const confirmed =
      session.phase === "review" &&
      userAnswer !== undefined &&
      isUserConfirmation(userAnswer) &&
      parsed.extraction?.confirm !== false;

    if (parsed.error && !isRecoverableExtractionError(parsed.error)) {
      return this.finishTurn(next, {
        spec,
        skippedPhases,
        questionText: parsed.question,
        extracted: false,
        error: parsed.error,
      });
    }

    const extraction = parsed.error ? undefined : parsed.extraction;
    if (extraction?.patch) {
      const committed = commitProjectSpecPatch(spec, extraction.patch);
      if (committed.ok) {
        spec = committed.spec;
        extracted = true;
      }
    } else if (extraction) {
      extracted = true;
    }

    const userSkipped =
      userAnswer !== undefined && isExplicitSkipAnswer(userAnswer);
    const skipRequested = isSkippable(session.phase) && userSkipped;
    let patch = extraction?.patch;
    let notedRecommendation = false;

    if (userAnswer !== undefined && !skipRequested) {
      const alreadySatisfied = isPhaseSatisfied(session.phase, spec, {
        skipped: skippedPhases.includes(session.phase),
        confirmed,
        patch,
      });
      const wantsHelp =
        !isProductPhase(session.phase) &&
        (isUnsureAnswer(userAnswer) || isAcceptanceAnswer(userAnswer));

      if (!alreadySatisfied || wantsHelp) {
        const fallback = isProductPhase(session.phase)
          ? inferPhasePatch(session.phase, userAnswer, spec)
          : wantsHelp
            ? recommendPhasePatch(session.phase, spec) ??
              inferPhasePatch(session.phase, userAnswer, spec)
            : inferPhasePatch(session.phase, userAnswer, spec) ??
              recommendPhasePatch(session.phase, spec);

        if (fallback) {
          const committed = commitProjectSpecPatch(spec, fallback);
          if (committed.ok) {
            spec = committed.spec;
            extracted = true;
            patch = fallback;
            notedRecommendation = wantsHelp;
          }
        }
      }
    }

    if (session.phase === "stack" && userAnswer !== undefined && !skipRequested) {
      const stack = interpretStackAnswer(userAnswer, spec.stack);
      if (Object.keys(stack).length > 0) {
        const committed = commitProjectSpecPatch(spec, { stack });
        if (committed.ok) {
          spec = committed.spec;
          extracted = true;
          patch = { ...patch, stack };
        }
      }
    }

    if (session.phase === "features" && userAnswer !== undefined && !skipRequested) {
      if (shouldExpandFeatures(spec, userAnswer)) {
        const features = recommendedFeatures(spec, userAnswer);
        const committed = commitProjectSpecPatch(spec, { features });
        if (committed.ok) {
          spec = committed.spec;
          extracted = true;
          patch = { ...patch, features };
        }
      }
    }

    if (session.phase === "database" && userAnswer !== undefined && !skipRequested) {
      if (isWeakDatabase(spec)) {
        const database = recommendedDatabase(spec);
        const committed = commitProjectSpecPatch(spec, { database });
        if (committed.ok) {
          spec = committed.spec;
          extracted = true;
          patch = { ...patch, database };
        }
      }
    }

    if (skipRequested && !skippedPhases.includes(session.phase)) {
      skippedPhases.push(session.phase);
    }

    if (
      userAnswer !== undefined &&
      isSkippable(session.phase) &&
      !skipRequested &&
      !isPhaseSatisfied(session.phase, spec, {
        skipped: skippedPhases.includes(session.phase),
        confirmed,
        patch,
      })
    ) {
      const recommended = recommendPhasePatch(session.phase, spec);
      if (recommended) {
        const committed = commitProjectSpecPatch(spec, recommended);
        if (committed.ok) {
          spec = committed.spec;
          extracted = true;
          patch = recommended;
          notedRecommendation = true;
        }
      }
    }

    const phaseSatisfied = isPhaseSatisfied(session.phase, spec, {
      skipped: skipRequested || skippedPhases.includes(session.phase),
      confirmed,
      patch,
    });

    let phase: InterviewPhase = session.phase;
    if (phaseSatisfied) {
      phase = nextPhase(session.phase);
    }

    const completed = phase === "complete";
    if (completed && !confirmed) {
      return this.finishTurn(next, {
        spec,
        skippedPhases,
        questionText: parsed.question,
        extracted,
        error: new InterviewError(
          InterviewErrorCode.COMPLETION_ERROR,
          "The interview cannot complete without explicit review confirmation.",
        ),
      });
    }

    return this.finishTurn(
      { ...next, phase, completed },
      {
        spec,
        skippedPhases,
        questionText: nextQuestionText(
          session.phase,
          phase,
          parsed.question,
          notedRecommendation,
        ),
        extracted,
      },
    );
  }

  private finishTurn(
    session: InterviewSession,
    input: {
      spec: ProjectSpec;
      skippedPhases: InterviewPhase[];
      questionText?: string;
      extracted: boolean;
      error?: InterviewError;
    },
  ): InterviewTurnResult {
    const questionSeq = input.questionText
      ? session.questionSeq + 1
      : session.questionSeq;
    const question = input.questionText
      ? questionFor(session.phase, questionSeq, input.questionText)
      : session.currentQuestion;

    const messages = input.questionText
      ? appendMessages(session.messages, [
          { role: "assistant", content: input.questionText },
        ])
      : session.messages;

    if (
      !session.completed &&
      !input.questionText &&
      !session.currentQuestion &&
      !input.error
    ) {
      return resultFromSession(
        {
          ...session,
          spec: input.spec,
          skippedPhases: input.skippedPhases,
          messages,
          questionSeq,
        },
        {
          extracted: input.extracted,
          error: new InterviewError(
            InterviewErrorCode.QUESTION_INVALID,
            "The model response did not include a usable next question.",
          ),
        },
      );
    }

    const nextSession: InterviewSession = {
      ...session,
      spec: input.spec,
      skippedPhases: input.skippedPhases,
      messages,
      questionSeq,
      currentQuestion: question,
    };

    return resultFromSession(nextSession, {
      extracted: input.extracted,
      error: input.error,
    });
  }
}
