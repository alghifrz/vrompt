import "server-only";
import { GenerationError } from "../../core/generation/errors";
import { AuthError, PersistenceError } from "../../server/persistence/errors";
import type { GenerationViewError } from "./view-model";

export function toSafeGenerationError(error: unknown): GenerationViewError {
  if (error instanceof AuthError) {
    return {
      code: error.code,
      message: "Please sign in to generate configuration.",
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

  if (error instanceof GenerationError) {
    if (error.code === "GENERATION_NOT_READY") {
      return {
        code: error.code,
        message:
          "This project is not ready for generation. Return to Review and mark the project as ready.",
        retryable: false,
      };
    }

    if (error.code === "GENERATION_INVALID_SPEC") {
      return {
        code: error.code,
        message: "The saved specification is invalid and cannot be generated.",
        retryable: false,
      };
    }

    if (
      error.code === "GENERATION_TARGET_INVALID" ||
      error.code === "GENERATION_TARGET_UNSUPPORTED"
    ) {
      return {
        code: error.code,
        message: "Select a supported generation target.",
        retryable: true,
      };
    }

    if (error.code === "GENERATION_INCONSISTENT") {
      return {
        code: error.code,
        message: "Generated output failed consistency checks and was not exported.",
        retryable: true,
      };
    }
  }

  return {
    code: "GENERATION_FAILED",
    message: "Generation failed. The saved specification was not changed.",
    retryable: true,
  };
}
