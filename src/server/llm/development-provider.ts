import { MockLLMProvider } from "../../core/llm/mock";
import type { LLMProvider, LLMRequest } from "../../core/llm/types";
import type { InterviewPhase } from "../../core/interview/types";

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

function responseFor(phase: string, answer: string): string {
  const text = answer || "the product";

  switch (phase as InterviewPhase) {
    case "discovery":
      if (!answer) {
        return structured("What are you building?", { patch: {} });
      }
      return structured("What is the main outcome you want first?", {
        patch: {
          project: {
            name: text.slice(0, 48) || "FieldKit",
            description: text,
            problem: text,
            targetUsers: ["Early users"],
            type: "web application",
          },
        },
      });
    case "goals":
      return structured("Which capabilities matter most at launch?", {
        patch: {
          goals: {
            primary: [{ id: "goal-1", statement: text }],
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
              name: text.slice(0, 40) || "Core feature",
              description: text,
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
              name: text.slice(0, 40) || "Primary user",
              description: text,
              goals: [text],
              permissions: ["use-app"],
            },
          ],
        },
      });
    case "stack":
    case "architecture":
    case "database":
    case "api":
    case "security":
    case "ai_rules":
      return structured("Anything else to capture in this section?", {
        skip: /^(skip|none|n\/a|no)$/i.test(text),
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
      content: responseFor(request.metadata?.phase ?? "discovery", latestAnswer(request)),
      provider: "dev-mock",
    }),
  });
}
