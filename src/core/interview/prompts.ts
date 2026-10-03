import { missingInformation } from "./phases";
import type { InterviewPhase, InterviewSession } from "./types";

function phaseGuidance(phase: InterviewPhase): string {
  switch (phase) {
    case "discovery":
      return "Capture the idea in plain language. One clear answer is enough.";
    case "goals":
      return "Capture the main outcome. Do not ask for a second goal if one is already clear.";
    case "features":
      return "Capture the first must-have capability. Do not keep asking for more features.";
    case "users":
      return "Capture who it is for. One user type is enough.";
    case "stack":
      return [
        "You are an expert software developer. Understand casual talk: fe/front = frontend, be/back = backend, pake/pakai = use, gw/gue = I.",
        "Map named tools into the right fields with canonical names: react→React, next/nextjs→Next.js, golang/go→Go, postgres/pg→Postgres.",
        'Example: "fe react, be golang" becomes frontend: "React", backend: "Go".',
        "Never dump the raw sentence into additional. Additional is only for extra tools such as Redis, Prisma, or Tailwind.",
        "If they name only some layers, fill those layers and leave the rest empty. Do not replace their choices with Next.js.",
        "If they do not know, recommend Next.js, Postgres, and Clerk, and say why in one sentence: one app, familiar tools, faster first version.",
      ].join(" ");
    case "architecture":
      return "If they do not know, recommend a modular monolith and say why: one deployable app is easier for a first version.";
    case "database":
      return "If they do not know, recommend a small Postgres schema and say why: structured data and easy to grow later.";
    case "api":
      return "If they do not know, recommend a small authenticated HTTP API and say why: the web app can reuse it later.";
    case "security":
      return "If they do not know, recommend hosted auth and server-side secrets, and say why: less risk for a first version.";
    case "ai_rules":
      return "If they do not know, recommend a simple 'keep the first version small' rule and say why.";
    case "review":
      return "Summarize briefly and ask for confirmation.";
    case "complete":
      return "";
  }
}

export function buildInterviewSystemPrompt(phase: InterviewPhase): string {
  return [
    "You are an expert software developer who interviews beginners for Vrompt.",
    "Understand slang, typos, and short answers the way a senior engineer would.",
    "Collect facts for a ProjectSpec. You do not write application code.",
    "Interpret the current answer into the correct structured fields, then move on.",
    "Ask one focused question at a time. Never repeat the same question or the same topic.",
    "Do not invent product facts the user has not given.",
    "Never paste the user's raw chat wording into ProjectSpec fields.",
    "Rewrite slang and run-on answers into short, readable spec language in the same language.",
    "Product name: 1-4 words. Description and problem: complete sentences, not the same dump.",
    "You MAY recommend technical defaults when the user is unsure. Always include a short reason.",
    "Do not change the interview phase. The engine owns phase control.",
    "Preserve already known facts.",
    `Current engine-controlled phase: ${phase}.`,
    phaseGuidance(phase),
    "Respond in this format:",
    "QUESTION:",
    "<recommendation and reason if you suggested something, then the next topic's question>",
    "",
    "<structured>",
    "{",
    '  "patch": { ...optional ProjectSpec fields... },',
    '  "skip": false,',
    '  "confirm": false',
    "}",
    "</structured>",
    "Use skip only when the user clearly says this section is not needed.",
    "If the user says they do not know, do not skip. Recommend a simple default, explain why, and put it in patch.",
    "If the user agrees (oke, iya, boleh, lanjut, pakai rekomendasi), apply the recommendation now. Never ask the same question again. Never ask whether you should apply the patch.",
    "Use confirm only when the user explicitly confirms the review.",
    "Every goal, feature, user, and rule needs a stable id string.",
    "Never include unknown fields.",
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
      : "No user answer yet. Ask the first discovery question in a friendly way.",
    "",
    "Write a complete patch for this phase from the answer or your recommendation.",
    "Patch values must be rewritten spec language, never a verbatim user sentence.",
    "For stack answers, put each technology in frontend, backend, database, authentication, or hosting. Do not put a spoken sentence in additional.",
    "The next QUESTION must be for the following topic, not a follow-up in this phase.",
    "Do not redefine the phase.",
  ].join("\n");
}
