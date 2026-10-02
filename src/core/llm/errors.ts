export const LLMErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTHENTICATION: "AUTHENTICATION",
  RATE_LIMIT: "RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  NETWORK: "NETWORK",
  UNKNOWN: "UNKNOWN",
} as const;

export type LLMErrorCode = (typeof LLMErrorCode)[keyof typeof LLMErrorCode];

export interface LLMErrorOptions {
  readonly provider?: string;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

const RETRYABLE_BY_DEFAULT: ReadonlySet<LLMErrorCode> = new Set([
  LLMErrorCode.RATE_LIMIT,
  LLMErrorCode.TIMEOUT,
  LLMErrorCode.NETWORK,
  LLMErrorCode.PROVIDER_ERROR,
]);

function defaultRetryable(code: LLMErrorCode): boolean {
  return RETRYABLE_BY_DEFAULT.has(code);
}

function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(Authorization:\s*)\S+/gi, "$1[REDACTED]");
}

/**
 * Structured LLM failure.
 *
 * Adapters should normalize known vendor failures into this type.
 * Unknown exceptions are left as-is; callers must not assume every thrown
 * value is an LLMError.
 */
export class LLMError extends Error {
  readonly code: LLMErrorCode;
  readonly provider?: string;
  readonly retryable: boolean;

  constructor(
    code: LLMErrorCode,
    message: string,
    options: LLMErrorOptions = {},
  ) {
    super(redactSecrets(message));
    this.name = "LLMError";
    this.code = code;
    this.provider = options.provider;
    this.retryable = options.retryable ?? defaultRetryable(code);

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
