import { createInitialProjectSpec } from "../../core/interview/engine";
import {
  detectAnswerLanguage,
  interpretDiscovery,
  interpretGoal,
  interpretUser,
} from "../../core/interview/interpret";
import {
  polishSpecLocally,
  SPEC_REWRITE_PURPOSE,
  specToRewritePatch,
} from "../../core/interview/rewrite";
import type { InterviewPhase } from "../../core/interview/types";
import { MockLLMProvider } from "../../core/llm/mock";
import type { LLMProvider, LLMRequest } from "../../core/llm/types";
import { ProjectSpecSchema } from "../../core/schema/project-spec";
import { recommendedFeatures } from "../../core/spec/domain";
import { clarifyingQuestion, needsClarification } from "../../core/interview/clarify";
import { hasStructuredStack, interpretStackAnswer } from "../../core/spec/stack";

/**
 * Server-side development interviewer.
 * Deterministic MockLLMProvider — not a production model vendor.
 */
function latestAnswer(request: LLMRequest): string {
  const content = request.messages.at(-1)?.content ?? "";
  const marker = "Latest user answer:\n";
  const index = content.lastIndexOf(marker);
  if (index === -1) {
    return "";
  }

  return content.slice(index + marker.length).split("\n\n")[0]?.trim() ?? "";
}

function structured(question: string, payload: Record<string, unknown>): string {
  return `QUESTION:\n${question}\n\n<structured>\n${JSON.stringify(payload)}\n</structured>`;
}

function specFromInterviewPrompt(content: string) {
  const match = content.match(
    /Known project facts \(canonical ProjectSpec draft\):\n([\s\S]*?)\n\nMissing information/,
  );
  if (!match?.[1]) {
    return undefined;
  }

  try {
    const parsed = ProjectSpecSchema.safeParse(JSON.parse(match[1]));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function specFromRewritePrompt(content: string) {
  const match = content.match(/<spec>\s*([\s\S]*?)\s*<\/spec>/);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    const parsed = ProjectSpecSchema.safeParse(JSON.parse(match[1]));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function rewriteResponse(request: LLMRequest): string {
  const spec = specFromRewritePrompt(request.messages.at(-1)?.content ?? "");
  if (!spec) {
    return structured("Rewritten.", { patch: {} });
  }

  return structured("Rewritten.", {
    patch: specToRewritePatch(polishSpecLocally(spec)),
  });
}

function responseFor(phase: string, answer: string, request?: LLMRequest): string {
  const text = answer || "the product";
  const language = detectAnswerLanguage(text);
  const knownSpec =
    request && specFromInterviewPrompt(request.messages.at(-1)?.content ?? "");

  switch (phase as InterviewPhase) {
    case "discovery": {
      if (!answer) {
        return structured("What are you building?", { patch: {} });
      }
      const spec = knownSpec ?? createInitialProjectSpec();
      if (needsClarification("discovery", text, spec)) {
        return structured(clarifyingQuestion("discovery", text, spec), {
          clarify: true,
          patch: {},
        });
      }
      return structured("What is the main outcome you want first?", {
        patch: {
          project: interpretDiscovery(answer),
        },
      });
    }
    case "goals": {
      const spec = knownSpec ?? createInitialProjectSpec();
      if (needsClarification("goals", text, spec)) {
        return structured(clarifyingQuestion("goals", text, spec), {
          clarify: true,
          patch: {},
        });
      }
      return structured("Which capabilities matter most at launch?", {
        patch: {
          goals: {
            primary: [
              {
                id: "goal-1",
                statement: interpretGoal(text, language),
              },
            ],
            successCriteria: [],
          },
        },
      });
    }
    case "features": {
      const spec = knownSpec ?? createInitialProjectSpec();
      if (needsClarification("features", text, spec)) {
        return structured(clarifyingQuestion("features", text, spec), {
          clarify: true,
          patch: {},
        });
      }
      return structured("Who will use this product?", {
        patch: {
          features: recommendedFeatures(spec, text),
        },
      });
    }
    case "users": {
      const spec = knownSpec ?? createInitialProjectSpec();
      if (needsClarification("users", text, spec)) {
        return structured(clarifyingQuestion("users", text, spec), {
          clarify: true,
          patch: {},
        });
      }
      const user = interpretUser(text, language);
      return structured("What technology stack are you using, if any?", {
        patch: {
          users: [
            {
              id: "user-1",
              name: user.name,
              description: user.description,
              goals: user.goals,
              permissions: ["use-app"],
            },
          ],
        },
      });
    }
    case "stack": {
      const stack = interpretStackAnswer(text);
      const known = hasStructuredStack(stack);
      return structured(
        known
          ? "Any architecture preference, or should I suggest a simple starting shape?"
          : "I recommend Next.js, Postgres, and Clerk because you can ship one app first. Any architecture preference, or should I suggest a simple starting shape?",
        {
          patch: {
            stack: known
              ? stack
              : {
                  frontend: "Next.js",
                  backend: "Next.js",
                  database: "Postgres",
                  authentication: "Clerk",
                  hosting: "Vercel",
                },
          },
        },
      );
    }
    case "architecture":
    case "database":
    case "api":
    case "security":
    case "ai_rules":
      return structured("Please confirm this project specification.", {
        patch: {},
      });
    case "review":
      return structured("Please confirm this project specification.", {
        confirm: true,
      });
    default:
      return structured("What are you building?", { patch: {} });
  }
}

export function createDevelopmentLLMProvider(): LLMProvider {
  return new MockLLMProvider({
    id: "dev-mock",
    name: "Development mock",
    response: (request) => ({
      content:
        request.metadata?.purpose === SPEC_REWRITE_PURPOSE
          ? rewriteResponse(request)
          : responseFor(request.metadata?.phase ?? "discovery", latestAnswer(request), request),
      provider: "dev-mock",
    }),
  });
}
