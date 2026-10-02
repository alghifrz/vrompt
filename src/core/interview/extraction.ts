import { InterviewError, InterviewErrorCode } from "./errors";
import { parseInterviewExtraction, parseProjectSpecPatch } from "./patch";
import { softenInterviewPayload } from "./soften";
import type { InterviewExtraction } from "./types";

function stripFences(value: string): string {
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? value).trim();
}

function extractJsonText(content: string): string | undefined {
  const structured = content.match(
    /<structured>\s*([\s\S]*?)\s*<\/structured>/i,
  );
  if (structured?.[1]) {
    return stripFences(structured[1].trim());
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim().startsWith("{")) {
    return fenced[1].trim();
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  return undefined;
}

export function extractQuestionText(content: string): string | undefined {
  const marked = content.match(
    /QUESTION:\s*([\s\S]*?)(?:<structured>|```|$)/i,
  );
  if (marked?.[1]?.trim()) {
    return marked[1].trim();
  }

  const beforeStructured = content.split(/<structured>/i)[0]?.trim();
  if (
    beforeStructured &&
    !beforeStructured.startsWith("{") &&
    beforeStructured.length > 0 &&
    beforeStructured.length <= 2000
  ) {
    const cleaned = beforeStructured.replace(/```[\s\S]*```/g, "").trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }

  return undefined;
}

function normalizeCandidate(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  if ("patch" in value || "skip" in value || "confirm" in value) {
    return value;
  }

  return { patch: value };
}

export function parseInterviewResponse(content: string): {
  extraction?: InterviewExtraction;
  question?: string;
  error?: InterviewError;
} {
  const question = extractQuestionText(content);
  const jsonText = extractJsonText(content);

  if (!jsonText) {
    return {
      question,
      error: new InterviewError(
        InterviewErrorCode.EXTRACTION_FAILED,
        "The model response did not contain a usable structured section.",
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      question,
      error: new InterviewError(
        InterviewErrorCode.EXTRACTION_FAILED,
        "The structured section was not valid JSON.",
      ),
    };
  }

  const candidate = softenInterviewPayload(normalizeCandidate(parsed));
  const extraction = parseInterviewExtraction(candidate);
  if (extraction.success) {
    return { extraction: extraction.data, question };
  }

  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "patch" in candidate
  ) {
    const patchOnly = parseProjectSpecPatch(
      (candidate as { patch: unknown }).patch,
    );
    if (!patchOnly.success && (candidate as { patch: unknown }).patch != null) {
      return {
        question,
        error: new InterviewError(
          InterviewErrorCode.PATCH_INVALID,
          "The extracted ProjectSpec patch failed validation.",
          {
            details: patchOnly.error.issues.map(
              (issue) => `${issue.path.join(".")}: ${issue.message}`,
            ),
          },
        ),
      };
    }
  }

  return {
    question,
    error: new InterviewError(
      InterviewErrorCode.PATCH_INVALID,
      "The extracted structured object failed validation.",
      {
        details: extraction.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        ),
      },
    ),
  };
}
