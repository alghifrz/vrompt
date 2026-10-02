import { AuthError, AuthErrorCode } from "../persistence/errors";

export interface AuthIdentity {
  readonly userId: string;
}

export type AuthReader = () => Promise<{ userId: string | null }>;

export type RequireAuth = () => Promise<AuthIdentity>;

export function createRequireAuth(readAuth: AuthReader): RequireAuth {
  return async () => {
    const { userId } = await readAuth();
    if (!userId || userId.trim().length === 0) {
      throw new AuthError(
        AuthErrorCode.UNAUTHENTICATED,
        "Authentication required.",
      );
    }

    return { userId };
  };
}

export function rejectIfAuthUnavailable(configured: boolean): void {
  if (!configured) {
    throw new AuthError(
      AuthErrorCode.UNAUTHENTICATED,
      "Authentication required.",
    );
  }
}

export function asAuthError(error: unknown): AuthError {
  return error instanceof AuthError
    ? error
    : new AuthError(AuthErrorCode.UNAUTHENTICATED, "Authentication required.");
}
