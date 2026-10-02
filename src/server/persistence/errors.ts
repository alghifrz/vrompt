export const PersistenceErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type PersistenceErrorCode =
  (typeof PersistenceErrorCode)[keyof typeof PersistenceErrorCode];

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly details: readonly string[];

  constructor(
    code: PersistenceErrorCode,
    message: string,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    this.details = details;
  }
}

export const AuthErrorCode = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
