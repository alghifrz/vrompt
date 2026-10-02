export const DiagnosticCode = {
  SECTION_MISSING: "SECTION_MISSING",
  SECTION_UNEXPECTED: "SECTION_UNEXPECTED",
  ITEM_MISSING: "ITEM_MISSING",
  AI_RULE_MISSING: "AI_RULE_MISSING",
  AI_RULE_DUPLICATE: "AI_RULE_DUPLICATE",
  AI_RULE_METADATA_MISSING: "AI_RULE_METADATA_MISSING",
  AI_RULE_GLOB_MISSING: "AI_RULE_GLOB_MISSING",
  OUTPUT_EMPTY: "OUTPUT_EMPTY",
  OUTPUT_INVALID_PATH: "OUTPUT_INVALID_PATH",
  OUTPUT_PATH_DUPLICATE: "OUTPUT_PATH_DUPLICATE",
  OUTPUT_UNDEFINED: "OUTPUT_UNDEFINED",
  OUTPUT_NULL: "OUTPUT_NULL",
  OUTPUT_OBJECT_STRING: "OUTPUT_OBJECT_STRING",
  ORDER_MISMATCH: "ORDER_MISMATCH",
  NON_DETERMINISTIC: "NON_DETERMINISTIC",
  TARGET_LIMITATION: "TARGET_LIMITATION",
} as const;

export type DiagnosticCode =
  (typeof DiagnosticCode)[keyof typeof DiagnosticCode];

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface ConsistencyDiagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  target?: string;
  path?: string;
  semanticPath?: string;
}

export interface ConsistencyReport {
  ok: boolean;
  diagnostics: ConsistencyDiagnostic[];
}

export function diagnostic(
  input: ConsistencyDiagnostic,
): ConsistencyDiagnostic {
  return input;
}

const CODE_ORDER: readonly DiagnosticCode[] = [
  DiagnosticCode.OUTPUT_EMPTY,
  DiagnosticCode.OUTPUT_INVALID_PATH,
  DiagnosticCode.OUTPUT_PATH_DUPLICATE,
  DiagnosticCode.OUTPUT_UNDEFINED,
  DiagnosticCode.OUTPUT_NULL,
  DiagnosticCode.OUTPUT_OBJECT_STRING,
  DiagnosticCode.NON_DETERMINISTIC,
  DiagnosticCode.SECTION_MISSING,
  DiagnosticCode.SECTION_UNEXPECTED,
  DiagnosticCode.ITEM_MISSING,
  DiagnosticCode.AI_RULE_MISSING,
  DiagnosticCode.AI_RULE_DUPLICATE,
  DiagnosticCode.AI_RULE_METADATA_MISSING,
  DiagnosticCode.AI_RULE_GLOB_MISSING,
  DiagnosticCode.ORDER_MISMATCH,
  DiagnosticCode.TARGET_LIMITATION,
];

export function compareDiagnostics(
  left: ConsistencyDiagnostic,
  right: ConsistencyDiagnostic,
): number {
  const leftRank = CODE_ORDER.indexOf(left.code);
  const rightRank = CODE_ORDER.indexOf(right.code);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const target = (left.target ?? "").localeCompare(right.target ?? "");
  if (target !== 0) {
    return target;
  }

  const semantic = (left.semanticPath ?? "").localeCompare(
    right.semanticPath ?? "",
  );
  if (semantic !== 0) {
    return semantic;
  }

  return left.message.localeCompare(right.message);
}

export function buildReport(
  diagnostics: readonly ConsistencyDiagnostic[],
): ConsistencyReport {
  const ordered = [...diagnostics].sort(compareDiagnostics);
  return {
    ok: !ordered.some((item) => item.severity === "error"),
    diagnostics: ordered,
  };
}
