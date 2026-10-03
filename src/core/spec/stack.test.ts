import { describe, expect, it } from "vitest";
import {
  interpretStackAnswer,
  parseStackAnswer,
  rescueStack,
} from "./stack";

describe("stack interpreter", () => {
  it("maps casual Indonesian frontend and backend talk into the right fields", () => {
    const stack = parseStackAnswer(
      "untuk fe gw mau pakai react aja, trus backend pakai golang",
    );

    expect(stack.frontend).toBe("React");
    expect(stack.backend).toBe("Go");
    expect(stack.additional ?? []).toEqual([]);
  });

  it("understands short aliases and does not invent a Next.js default", () => {
    const stack = parseStackAnswer("fe react, be go, db postgres");

    expect(stack).toMatchObject({
      frontend: "React",
      backend: "Go",
      database: "Postgres",
    });
    expect(stack.authentication).toBeUndefined();
    expect(stack.hosting).toBeUndefined();
  });

  it("treats Next.js as a full-stack default when no separate backend is named", () => {
    expect(parseStackAnswer("pake nextjs aja")).toMatchObject({
      frontend: "Next.js",
      backend: "Next.js",
    });
  });

  it("pulls a spoken dump out of additional", () => {
    const stack = rescueStack({
      additional: ["untuk fe gw mau pakai react aja, trus backend pakai golang"],
    });

    expect(stack.frontend).toBe("React");
    expect(stack.backend).toBe("Go");
    expect(stack.additional).toEqual([]);
  });

  it("keeps extra tools in additional after interpreting a mixed answer", () => {
    const stack = interpretStackAnswer("react, golang, prisma, redis");

    expect(stack.frontend).toBe("React");
    expect(stack.backend).toBe("Go");
    expect(stack.additional).toEqual(["Prisma", "Redis"]);
  });
});
