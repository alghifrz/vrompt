export const GenerationErrorCode = {
  GENERATION_INVALID_SPEC: "GENERATION_INVALID_SPEC",
  GENERATION_NOT_READY: "GENERATION_NOT_READY",
  GENERATION_TARGET_INVALID: "GENERATION_TARGET_INVALID",
  GENERATION_TARGET_UNSUPPORTED: "GENERATION_TARGET_UNSUPPORTED",
  GENERATION_FAILED: "GENERATION_FAILED",
  GENERATION_INCONSISTENT: "GENERATION_INCONSISTENT",
  EXPORT_FAILED: "EXPORT_FAILED",
  EXPORT_INVALID_PATH: "EXPORT_INVALID_PATH",
} as const;

export type GenerationErrorCode =
  (typeof GenerationErrorCode)[keyof typeof GenerationErrorCode];

export class GenerationError extends Error {
  readonly code: GenerationErrorCode;
  readonly details: readonly string[];

  constructor(
    code: GenerationErrorCode,
    message: string,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.details = details;
  }
}
