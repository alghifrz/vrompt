import "server-only";
import { AuthError, PersistenceError } from "../../server/persistence/errors";
import type { ReviewViewError } from "./view-model";

export function toSafeReviewError(error: unknown): ReviewViewError {
  if (error instanceof AuthError) {
    return {
      code: error.code,
      message: "Please sign in to review this specification.",
      retryable: false,
    };
  }

  if (error instanceof PersistenceError && error.code === "NOT_FOUND") {
    return {
      code: error.code,
      message: "This project is not available.",
      retryable: false,
    };
  }

  if (error instanceof PersistenceError && error.code === "VALIDATION_FAILED") {
    return {
      code: error.code,
      message:
        "This specification still needs attention before it can be saved.",
      retryable: true,
    };
  }

  return {
    code: "SERVER_ERROR",
    message: "Unable to save. Your edits are still in the editor.",
    retryable: true,
  };
}
