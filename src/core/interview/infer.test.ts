import { describe, expect, it } from "vitest";
import { createInitialProjectSpec } from "./engine";
import {
  inferPhasePatch,
  isAcceptanceAnswer,
  isExplicitSkipAnswer,
  isUnsureAnswer,
  recommendPhasePatch,
} from "./infer";

describe("interview infer", () => {
  it("treats 'I do not know' as unsure, not an empty skip", () => {
    expect(isUnsureAnswer("gatau")).toBe(true);
    expect(isUnsureAnswer("idk")).toBe(true);
    expect(isUnsureAnswer("terserah")).toBe(true);
    expect(isUnsureAnswer("ga ada")).toBe(true);
    expect(isExplicitSkipAnswer("tidak perlu")).toBe(true);
    expect(isExplicitSkipAnswer("gatau")).toBe(false);
    expect(isUnsureAnswer("bangun pagi dan olahraga")).toBe(false);
    expect(isAcceptanceAnswer("oke boleh")).toBe(true);
    expect(isAcceptanceAnswer("iya")).toBe(true);
    expect(isAcceptanceAnswer("lanjutkan")).toBe(true);
    expect(isAcceptanceAnswer("ia lanjutkan")).toBe(true);
    expect(isAcceptanceAnswer("iiya setuju")).toBe(true);
    expect(isAcceptanceAnswer("iiya boleh")).toBe(true);
    expect(isAcceptanceAnswer("iya pakai yang rekomendasi aja")).toBe(true);
    expect(isAcceptanceAnswer("yang anda rekomendasikan saja")).toBe(true);
    expect(isAcceptanceAnswer("ok hosted auth")).toBe(true);
  });

  it("still recommends security when the spec only has an empty security object", () => {
    const patch = recommendPhasePatch("security", {
      ...createInitialProjectSpec(),
      security: {},
    });

    expect(patch?.security?.authentication?.[0]).toMatch(/hosted auth/i);
  });

  it("fills discovery from one informal answer", () => {
    const patch = inferPhasePatch(
      "discovery",
      "Aplikasi habit tracker namanya Daities",
      createInitialProjectSpec(),
    );

    expect(patch?.project?.name).toBe("Aplikasi habit tracker namanya Daities");
    expect(patch?.project?.description).toContain("Daities");
    expect(patch?.project?.targetUsers).toEqual(["Primary users"]);
  });

  it("turns a short goals answer into one primary goal", () => {
    const patch = inferPhasePatch("goals", "bangun pagi, olahraga, baca buku", {
      ...createInitialProjectSpec(),
    });

    expect(patch?.goals?.primary).toEqual([
      {
        id: "goal-1",
        statement: "bangun pagi, olahraga, baca buku",
      },
    ]);
  });

  it("recommends a beginner stack when the user does not know", () => {
    const patch = recommendPhasePatch("stack", createInitialProjectSpec());

    expect(patch?.stack).toMatchObject({
      frontend: "Next.js",
      database: "Postgres",
      authentication: "Clerk",
    });
  });
});
