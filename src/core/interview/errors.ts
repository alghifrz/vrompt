export const InterviewErrorCode = {
  INVALID_SESSION: "INVALID_SESSION",
  INVALID_ANSWER: "INVALID_ANSWER",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  PATCH_INVALID: "PATCH_INVALID",
  SPEC_INVALID: "SPEC_INVALID",
  QUESTION_INVALID: "QUESTION_INVALID",
  PHASE_ERROR: "PHASE_ERROR",
  COMPLETION_ERROR: "COMPLETION_ERROR",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type InterviewErrorCode =
  (typeof InterviewErrorCode)[keyof typeof InterviewErrorCode];

export interface InterviewErrorOptions {
  readonly cause?: unknown;
  readonly retryable?: boolean;
  readonly details?: readonly string[];
}

function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(Authorization:\s*)\S+/gi, "$1[REDACTED]");
}

export class InterviewError extends Error {
  readonly code: InterviewErrorCode;
  readonly retryable: boolean;
  readonly details: readonly string[];

  constructor(
    code: InterviewErrorCode,
    message: string,
    options: InterviewErrorOptions = {},
  ) {
    super(redactSecrets(message));
    this.name = "InterviewError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? [];

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
