import { describe, expect, it } from "vitest";
import { MockLLMProvider } from "../llm/mock";
import type { ProjectSpec } from "../schema/project-spec";
import { createInitialProjectSpec } from "./engine";
import {
  applySpecLanguagePass,
  buildSpecRewriteSystemPrompt,
  needsSpecRewrite,
  polishSpecLocally,
  rewriteProjectSpec,
} from "./rewrite";

const rawSpec: ProjectSpec = {
  project: {
    name: "gw punya warung, jadi pencatatannya kacau banget",
    description: "gw punya warung, jadi pencatatannya kacau banget",
    problem: "gw punya warung, jadi pencatatannya kacau banget",
    targetUsers: ["Primary users"],
    type: "web application",
    status: "draft",
  },
  goals: {
    primary: [{ id: "goal-1", statement: "pencatatan yang terstruktur gitu" }],
    successCriteria: [],
  },
  features: [
    {
      id: "feature-1",
      name: "merekap pencatatan warungf",
      description: "merekap pencatatan warungf",
      priority: "must",
      status: "planned",
      acceptanceCriteria: [],
    },
  ],
  users: [
    {
      id: "user-1",
      name: "penjaga warung kek saya",
      description: "penjaga warung kek saya",
      goals: ["penjaga warung kek saya"],
      permissions: ["use-app"],
    },
  ],
};

describe("spec rewrite", () => {
  it("does not flag a polished spec or the placeholder draft", () => {
    expect(needsSpecRewrite(createInitialProjectSpec())).toBe(false);
    expect(
      needsSpecRewrite({
        project: {
          name: "FieldKit",
          description: "A field toolkit.",
          problem: "Visit notes are scattered.",
          targetUsers: ["Dispatchers"],
          type: "web application",
          status: "draft",
        },
      }),
    ).toBe(false);
  });

  it("flags a spec that still contains raw chat wording", () => {
    expect(needsSpecRewrite(rawSpec)).toBe(true);
  });

  it("asks the model to rewrite slang instead of copying it", () => {
    expect(buildSpecRewriteSystemPrompt()).toMatch(/never copy slang/i);
    expect(buildSpecRewriteSystemPrompt()).toMatch(/short name/i);
  });

  it("rescues a spoken stack dump into frontend and backend", () => {
    const polished = polishSpecLocally({
      ...rawSpec,
      stack: {
        additional: ["untuk fe gw mau pakai react aja, trus backend pakai golang"],
      },
    });

    expect(polished.stack?.frontend).toBe("React");
    expect(polished.stack?.backend).toBe("Go");
    expect(polished.stack?.additional ?? []).toEqual([]);
  });

  it("cleans identical slang dumps into distinct readable fields", () => {
    const polished = polishSpecLocally(rawSpec);

    expect(polished.project.name).not.toMatch(/\bgw\b/i);
    expect(polished.project.name.split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(polished.project.description).not.toMatch(/\bbanget\b/i);
    expect(polished.project.problem).not.toBe(polished.project.description);
    expect(polished.goals?.primary[0]?.statement).not.toMatch(/\bgitu\b/i);
    expect(polished.users?.[0]?.name).not.toMatch(/\bkek\b/i);
    expect(needsSpecRewrite(polished)).toBe(false);
  });

  it("applies a model rewrite patch when the provider returns one", async () => {
    const provider = new MockLLMProvider({
      response: {
        content: [
          "<structured>",
          JSON.stringify({
            patch: {
              project: {
                name: "Catatan Warung",
                description:
                  "Aplikasi pencatatan untuk warung agar catatan stok dan penjualan lebih rapi.",
                problem:
                  "Pencatatan warung masih berantakan dan sulit dilacak.",
                targetUsers: ["Pemilik warung"],
                type: "web application",
                status: "draft",
              },
            },
          }),
          "</structured>",
        ].join("\n"),
        provider: "mock",
      },
    });

    const rewritten = await rewriteProjectSpec(provider, rawSpec);
    expect(rewritten.project.name).toBe("Catatan Warung");
    expect(rewritten.project.description).toMatch(/aplikasi pencatatan/i);
  });

  it("falls back to local cleanup when the model returns nothing useful", async () => {
    const provider = new MockLLMProvider({
      response: {
        content: "QUESTION:\nNext?\n\n<structured>\n{\"patch\":{}}\n</structured>",
        provider: "mock",
      },
    });

    const next = await applySpecLanguagePass(rawSpec, provider);
    expect(next.project.name).not.toBe(rawSpec.project.name);
    expect(next.project.description).not.toMatch(/\bgw\b/i);
  });
});
