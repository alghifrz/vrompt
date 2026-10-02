import { describe, expect, it } from "vitest";
import { parseInterviewResponse } from "./extraction";
import { softenInterviewPayload } from "./soften";

describe("soften interview payload", () => {
  it("keeps supported fields and drops extras", () => {
    const softened = softenInterviewPayload({
      patch: {
        extra: true,
        project: { name: "FieldKit", notes: "ignore" },
      },
      confidence: 0.9,
    });

    expect(softened).toEqual({
      patch: {
        project: { name: "FieldKit" },
      },
    });
  });

  it("assigns a goal id and default success criteria", () => {
    const parsed = parseInterviewResponse(
      `QUESTION:\nWhat next?\n<structured>${JSON.stringify({
        patch: {
          goals: {
            primary: [{ statement: "Build better habits" }],
          },
        },
      })}</structured>`,
    );

    expect(parsed.error).toBeUndefined();
    expect(parsed.extraction?.patch?.goals).toEqual({
      primary: [{ id: "goal-build-better-habits", statement: "Build better habits" }],
      successCriteria: [],
    });
  });
});
