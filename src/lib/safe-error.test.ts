import { describe, expect, it } from "vitest";
import { GenerationError, GenerationErrorCode } from "../core/generation/errors";
import { AuthError, AuthErrorCode, PersistenceError, PersistenceErrorCode } from "../server/persistence/errors";
import { toSafeGenerationError } from "./generation/safe-error";
import { toSafeInterviewError } from "./interview/safe-error";
import { toSafeReviewError } from "./review/safe-error";

describe("safe user-facing errors", () => {
  it("does not leak stack traces or provider internals", () => {
    const raw = new Error("DrizzleQueryError: CLERK_SECRET_KEY=sk_test leaked");
    const interview = toSafeInterviewError(raw);
    const review = toSafeReviewError(raw);
    const generation = toSafeGenerationError(raw);

    for (const error of [interview, review, generation]) {
      expect(error.message).not.toContain("DrizzleQueryError");
      expect(error.message).not.toContain("sk_test");
      expect(error.message).not.toContain("CLERK_SECRET_KEY");
      expect(error.message).not.toMatch(/TypeError|at /);
    }
  });

  it("maps known failures to recoverable copy", () => {
    expect(
      toSafeReviewError(
        new PersistenceError(PersistenceErrorCode.NOT_FOUND, "hidden"),
      ).message,
    ).toBe("This project is not available.");
    expect(
      toSafeInterviewError(
        new AuthError(AuthErrorCode.UNAUTHENTICATED, "Authentication required."),
      ).message,
    ).toBe("Please sign in to continue the interview.");
    expect(
      toSafeGenerationError(
        new GenerationError(
          GenerationErrorCode.GENERATION_NOT_READY,
          "internal",
        ),
      ).message,
    ).toContain("not ready for generation");
  });
});
