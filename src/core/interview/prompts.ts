import { missingInformation } from "./phases";
import type { InterviewPhase, InterviewSession } from "./types";

export function buildInterviewSystemPrompt(phase: InterviewPhase): string {
  return [
    "You are a project-requirements interviewer for Vrompt.",
    "Collect facts for a ProjectSpec. You do not write application code.",
    "Ask one focused question at a time.",
    "Do not invent facts the user has not provided.",
    "Do not change the interview phase. The engine owns phase control.",
    "Preserve already known facts. Only include fields you can support from the conversation.",
    `Current engine-controlled phase: ${phase}.`,
    "Respond in this format:",
    "QUESTION:",
    "<next interview question>",
    "",
    "<structured>",
    "{",
    '  "patch": { ...optional ProjectSpec fields... },',
    '  "skip": false,',
    '  "confirm": false',
    "}",
    "</structured>",
    "Use skip only when the current optional section does not apply.",
    "Use confirm only when the user explicitly confirms the review.",
    "patch may be empty. Never include unknown fields.",
  ].join("\n");
}

export function buildInterviewUserPrompt(
  session: InterviewSession,
  latestAnswer?: string,
): string {
  const missing = missingInformation(session.phase, session.spec);

  return [
    `Interview id: ${session.id}`,
    `Current phase: ${session.phase}`,
    `Completed: ${session.completed ? "yes" : "no"}`,
    "",
    "Known project facts (canonical ProjectSpec draft):",
    JSON.stringify(session.spec, null, 2),
    "",
    "Missing information for this phase:",
    missing.length > 0 ? missing.map((item) => `- ${item}`).join("\n") : "- none",
    "",
    latestAnswer !== undefined
      ? `Latest user answer:\n${latestAnswer}`
      : "No user answer yet. Ask the first discovery question.",
    "",
    "Extract only supported facts into patch. Do not redefine the phase.",
  ].join("\n");
}
