import "server-only";
import { InterviewError, InterviewErrorCode } from "../../core/interview/errors";
import { AuthError, PersistenceError } from "../../server/persistence/errors";
import type { InterviewViewError } from "./view-model";

export function toSafeInterviewError(error: unknown): InterviewViewError {
  if (error instanceof AuthError) {
    return {
      code: error.code,
      message: "Please sign in to continue the interview.",
      retryable: false,
    };
  }

  if (error instanceof PersistenceError && error.code === "NOT_FOUND") {
    return {
      code: error.code,
      message: "This interview is not available.",
      retryable: false,
    };
  }

  if (error instanceof PersistenceError && error.code === "VALIDATION_FAILED") {
    return {
      code: error.code,
      message:
        "We couldn't process that answer. Your previous progress is safe.",
      retryable: true,
    };
  }

  if (error instanceof InterviewError) {
    if (error.code === InterviewErrorCode.PROVIDER_ERROR) {
      return {
        code: error.code,
        message: "The interviewer is temporarily unavailable. Try again.",
        retryable: error.retryable,
      };
    }

    if (
      error.code === InterviewErrorCode.INVALID_ANSWER ||
      error.code === InterviewErrorCode.EXTRACTION_FAILED ||
      error.code === InterviewErrorCode.PATCH_INVALID ||
      error.code === InterviewErrorCode.SPEC_INVALID
    ) {
      return {
        code: error.code,
        message:
          "We couldn't process that answer. Your previous progress is safe.",
        retryable: true,
      };
    }

    if (error.code === InterviewErrorCode.COMPLETION_ERROR) {
      return {
        code: error.code,
        message: "This interview is already complete.",
        retryable: false,
      };
    }
  }

  return {
    code: "SERVER_ERROR",
    message: "Something went wrong. Your typed answer was kept so you can retry.",
    retryable: true,
  };
}
