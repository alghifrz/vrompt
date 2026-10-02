import { describe, expect, it } from "vitest";
import { AuthError, AuthErrorCode } from "../persistence/errors";
import {
  asAuthError,
  createRequireAuth,
  rejectIfAuthUnavailable,
} from "./require-auth";

describe("createRequireAuth", () => {
  it("returns the authenticated user id", async () => {
    const requireAuth = createRequireAuth(async () => ({ userId: "user_abc" }));

    await expect(requireAuth()).resolves.toEqual({ userId: "user_abc" });
  });

  it("rejects unauthenticated access", async () => {
    const requireAuth = createRequireAuth(async () => ({ userId: null }));

    await expect(requireAuth()).rejects.toMatchObject({
      name: "AuthError",
      code: AuthErrorCode.UNAUTHENTICATED,
    });
  });

  it("rejects a blank user id", async () => {
    const requireAuth = createRequireAuth(async () => ({ userId: "   " }));

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthError);
  });

  it("treats a missing auth provider as unauthenticated", () => {
    expect(() => rejectIfAuthUnavailable(false)).toThrow(AuthError);
    expect(() => rejectIfAuthUnavailable(true)).not.toThrow();
  });

  it("does not leak provider internals from auth failures", () => {
    const wrapped = asAuthError(new Error("Clerk secret sk-test leaked"));
    expect(wrapped).toBeInstanceOf(AuthError);
    expect(wrapped.message).toBe("Authentication required.");
    expect(wrapped.message).not.toContain("sk-test");
  });
});
