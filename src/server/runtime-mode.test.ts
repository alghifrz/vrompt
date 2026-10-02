import { describe, expect, it } from "vitest";
import { PersistenceError, PersistenceErrorCode } from "./persistence/errors";
import { resolvePersistenceMode } from "./runtime-mode";

describe("resolvePersistenceMode", () => {
  it("uses postgres when DATABASE_URL is set", () => {
    expect(
      resolvePersistenceMode({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://vrompt:vrompt@localhost:5432/vrompt",
      }),
    ).toBe("postgres");
  });

  it("uses memory in local development without DATABASE_URL", () => {
    expect(resolvePersistenceMode({ NODE_ENV: "development" })).toBe("memory");
    expect(resolvePersistenceMode({ NODE_ENV: "test" })).toBe("memory");
  });

  it("fails clearly in production without DATABASE_URL", () => {
    expect(() => resolvePersistenceMode({ NODE_ENV: "production" })).toThrow(
      PersistenceError,
    );
    try {
      resolvePersistenceMode({ NODE_ENV: "production" });
    } catch (error) {
      expect(error).toMatchObject({
        code: PersistenceErrorCode.DATABASE_ERROR,
        message: "DATABASE_URL is required in production.",
      });
    }
  });
});
