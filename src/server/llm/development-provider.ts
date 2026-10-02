import { MockLLMProvider } from "../../core/llm/mock";
import type { LLMProvider, LLMRequest } from "../../core/llm/types";
import type { InterviewPhase } from "../../core/interview/types";
import {
  polishSpecLocally,
  SPEC_REWRITE_PURPOSE,
  specToRewritePatch,
} from "../../core/interview/rewrite";
import { ProjectSpecSchema } from "../../core/schema/project-spec";

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

function firstClause(text: string, max: number): string {
  const clause = text.split(/[,.\n]/)[0]?.trim() || text.trim();
  return clause.slice(0, max) || "New project";
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

function responseFor(phase: string, answer: string): string {
  const text = answer || "the product";
  const name = firstClause(text, 32);

  switch (phase as InterviewPhase) {
    case "discovery":
      if (!answer) {
        return structured("What are you building?", { patch: {} });
      }
      return structured("What is the main outcome you want first?", {
        patch: {
          project: {
            name,
            description: `A web application for ${text.slice(0, 160)}.`,
            problem: `The current workflow is hard to keep organized: ${text.slice(0, 160)}.`,
            targetUsers: ["Early users"],
            type: "web application",
          },
        },
      });
    case "goals":
      return structured("Which capabilities matter most at launch?", {
        patch: {
          goals: {
            primary: [
              {
                id: "goal-1",
                statement: `Deliver a first version that ${text.slice(0, 160)}.`,
              },
            ],
            successCriteria: [],
          },
        },
      });
    case "features":
      return structured("Who will use this product?", {
        patch: {
          features: [
            {
              id: "feature-1",
              name: name || "Core feature",
              description: `Users can ${text.slice(0, 160)}.`,
              priority: "must",
              status: "planned",
              acceptanceCriteria: [],
            },
          ],
        },
      });
    case "users":
      return structured("What technology stack are you using, if any?", {
        patch: {
          users: [
            {
              id: "user-1",
              name: name || "Primary user",
              description: `The person who ${text.slice(0, 160)}.`,
              goals: [`Use the product to ${text.slice(0, 80)}.`],
              permissions: ["use-app"],
            },
          ],
        },
      });
    case "stack":
      return structured(
        "I recommend Next.js, Postgres, and Clerk because you can ship one app first. Any architecture preference, or should I suggest a simple starting shape?",
        {
          patch: {
            stack: {
              frontend: "Next.js",
              backend: "Next.js",
              database: "Postgres",
              authentication: "Clerk",
              hosting: "Vercel",
            },
          },
        },
      );
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
          : responseFor(request.metadata?.phase ?? "discovery", latestAnswer(request)),
      provider: "dev-mock",
    }),
  });
}
